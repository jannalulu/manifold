import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)

import {
  uniq,
  sum,
  countBy,
  mapValues,
  intersection,
  mergeWith,
  pickBy,
} from 'lodash'
import { log, logMemory, revalidateStaticProps } from 'shared/utils'
import { average, median } from 'common/util/math'
import {
  createSupabaseDirectClient,
  type SupabaseDirectClient,
} from 'shared/supabase/init'
import { bulkUpsert } from 'shared/supabase/utils'
import { saveCalibrationData } from 'shared/calculate-calibration'
import {
  MANA_PURCHASE_RATE_CHANGE_DATE,
  MANA_PURCHASE_RATE_REVERT_DATE,
} from 'common/envs/constants'
import {
  updateTxnStats,
  insertLatestManaStats,
} from 'shared/calculate-mana-stats'
import { getFeedConversionScores } from 'shared/feed-analytics'
import { buildArray } from 'common/util/array'
import { type Tables } from 'common/supabase/utils'
import { recalculateAllUserPortfolios } from 'shared/mana-supply'

interface StatEvent {
  id: string
  userId: string
  ts: number
}
type StatBet = StatEvent & { amount: number; token: 'MANA' | 'CASH' }
type StatUser = StatEvent & {
  d1BetCount: number
  freeQuestionsCreated: number | undefined
  bioIsLong: boolean | undefined
  dashboardCount: number
  referrerId: string | undefined
}

export const updateStatsCore = async (daysAgo: number) => {
  // We run the script at 4am, but we want data from the start of each day up until last midnight.
  const endDay = dayjs().tz('America/Los_Angeles')
  const startDay = endDay.subtract(daysAgo, 'day')
  const end = endDay.format('YYYY-MM-DD')
  const start = startDay.format('YYYY-MM-DD')

  const pg = createSupabaseDirectClient()

  await updateStatsBetween(pg, start, end)

  const startOfYesterday = endDay.subtract(1, 'day').startOf('day').valueOf()
  await updateTxnStats(pg, startOfYesterday, 1)
  await recalculateAllUserPortfolios(pg)
  await insertLatestManaStats(pg)

  await saveCalibrationData(pg)

  await revalidateStaticProps(`/stats`)

  log('Done')
}

export const updateCashStatsCore = async (daysAgo: number) => {
  const endDay = dayjs().tz('America/Los_Angeles')
  const startDay = endDay.subtract(daysAgo, 'day')
  const end = endDay.format('YYYY-MM-DD')
  const start = startDay.format('YYYY-MM-DD')

  const pg = createSupabaseDirectClient()
  await updateCashActivityStats(pg, start, end)
  await updateDailyCashSales(pg, start, end)
}

// YYYY-MM-DD
export const updateStatsBetween = async (
  pg: SupabaseDirectClient,
  start: string,
  end: string
) => {
  await updateActivityStats(pg, start, end)
  await updateDailySales(pg, start, end)
  await updateConversionScores(pg, start, end)
}

async function getDailyBets(
  pg: SupabaseDirectClient,
  start: string,
  end: string,
  token?: 'CASH'
) {
  const bets = await pg.manyOrNone(
    `select
    date_trunc('day', b.created_time at time zone 'america/los_angeles')::date as day,
    json_agg(json_build_object(
      'ts', ts_to_millis(b.created_time),
      'userId', user_id,
      'token', c.token,
      'amount', amount,
      'id', bet_id
    )) as values
    from contract_bets b join contracts c on b.contract_id = c.id
    where
      b.created_time >= date_to_midnight_pt($1)
      and b.created_time < date_to_midnight_pt($2)
      and is_redemption = false
      and ($3 is null or c.token = $3)
    group by day
    order by day asc`,
    [start, end, token]
  )

  return bets as { day: string; values: StatBet[] }[]
}

async function getDailyViewers(
  pg: SupabaseDirectClient,
  start: string,
  end: string
) {
  const viewers = await pg.manyOrNone(
    `select
    date_trunc('day', ts at time zone 'america/los_angeles')::date as day,
    count(distinct(data->>'deviceId')) as viewer_count
    from user_events
    where
      ts >= date_to_midnight_pt($1)
      and ts < date_to_midnight_pt($2)
    group by day
    order by day asc`,
    [start, end]
  )

  return viewers as { day: string; viewer_count: number }[]
}

async function getDailyComments(
  pg: SupabaseDirectClient,
  start: string,
  end: string,
  token?: 'CASH'
) {
  const cashCommentsFilter =
    token === 'CASH'
      ? `and c.data->>'siblingContractId' is not null and c.token = 'MANA'`
      : ''
  const comments = await pg.manyOrNone(
    `select
      date_trunc('day', cc.created_time at time zone 'america/los_angeles')::date as day,
      json_agg(json_build_object(
        'ts', ts_to_millis(cc.created_time),
        'userId', cc.user_id,
        'id', comment_id
      )) as values
    from contract_comments cc
    join contracts c on cc.contract_id = c.id
    where
      cc.created_time >= date_to_midnight_pt($1)
      and cc.created_time < date_to_midnight_pt($2)
      ${cashCommentsFilter}
    group by day
    order by day asc`,
    [start, end]
  )

  return comments as { day: string; values: StatEvent[] }[]
}

async function getDailyContracts(
  pg: SupabaseDirectClient,
  start: string,
  end: string,
  token?: 'CASH'
) {
  const contracts = await pg.manyOrNone(
    `select
      date_trunc('day', created_time at time zone 'america/los_angeles')::date as day,
      json_agg(json_build_object(
        'ts', ts_to_millis(created_time),
        'userId', creator_id,
        'id', id
      )) as values
    from contracts
    where
      created_time >= date_to_midnight_pt($1)
      and created_time < date_to_midnight_pt($2)
      and ($3 is null or token = $3)
    group by day
    order by day asc`,
    [start, end, token]
  )

  return contracts as { day: string; values: StatEvent[] }[]
}

async function getDailyNewUsers(
  pg: SupabaseDirectClient,
  start: string,
  end: string
) {
  const users = await pg.manyOrNone(
    `with all_new_users as (
      select
        u.created_time,
        u.id,
        (u.data->>'bio') as bio,
        (u.data->'freeQuestionsCreated')::int as free_questions_created,
        count(cb.bet_id) filter (where cb.bet_id is not null) as bet_count_within_24h,
        count(d.id) filter (where d.id is not null) as dashboard_count,
        u.data->>'referredByUserId' as referrer_id
      from users u
        left join contract_bets cb on u.id = cb.user_id and cb.is_redemption = false
        and (cb.created_time >= u.created_time and cb.created_time <= u.created_time + interval '24 hours')
      left join dashboards d on u.id = d.creator_id
    where
      u.created_time >= date_to_midnight_pt($1)
      and u.created_time < date_to_midnight_pt($2)
      and u.data->'fromLove' is null
    group by u.id
    )
    select
      date_trunc('day', created_time at time zone 'america/los_angeles')::date as day,
      json_agg(json_build_object(
        'ts', ts_to_millis(created_time),
        'userId', id,
        'id', id,
        'bioIsLong', length(bio) > 10,
        'freeQuestionsCeated', free_questions_created,
        'd1BetCount', bet_count_within_24h,
        'dashboardCount', dashboard_count,
        'referrerId', referrer_id
      )) as values
    from all_new_users
    group by day
    order by day asc`,
    [start, end]
  )

  return users as { day: string; values: StatUser[] }[]
}

// this should at least be two months for monthly stats
const bufferDays = 61

export const updateActivityStats = async (
  pg: SupabaseDirectClient,
  start: string,
  end: string
) => {
  const startWithBuffer = dayjs(start)
    .subtract(bufferDays, 'days')
    .format('YYYY-MM-DD')

  log(`Fetching data for activity stats between ${startWithBuffer} and ${end}`)
  const [dailyBets, dailyContracts, dailyComments, dailyViewers] =
    await Promise.all([
      getDailyBets(pg, startWithBuffer, end),
      getDailyContracts(pg, startWithBuffer, end),
      getDailyComments(pg, startWithBuffer, end),
      getDailyViewers(pg, startWithBuffer, end),
    ])
  logMemory()

  log('upsert viewer counts')
  await bulkUpsertStats(
    pg,
    dailyViewers.map((viewers, i) => ({
      start_date: viewers.day,
      dav: viewers.viewer_count,
      wav: average(dailyViewers.slice(i - 6, i + 1).map((v) => v.viewer_count)),
      mav: average(
        dailyViewers.slice(i - 29, i + 1).map((v) => v.viewer_count)
      ),
    }))
  )

  log('upsert bets counts and totals')
  await bulkUpsertStats(
    pg,
    dailyBets.map((bets) => ({
      start_date: bets.day,
      bet_count: bets.values.length,
      bet_amount:
        sum(
          bets.values.filter((b) => b.token === 'MANA').map((b) => b.amount)
        ) / 100,
    }))
  )

  log('upsert contract counts')
  await bulkUpsertStats(
    pg,
    dailyContracts.map((contracts) => ({
      start_date: contracts.day,
      contract_count: contracts.values.length,
    }))
  )

  log('upsert comment counts')
  await bulkUpsertStats(
    pg,
    dailyComments.map((comments) => ({
      start_date: comments.day,
      comment_count: comments.values.length,
    }))
  )

  // unique ids across contract, bet, and comment actions
  const contractUsersByDay = Object.fromEntries(
    dailyContracts.map((contracts) => [
      contracts.day,
      contracts.values.map((c) => c.userId),
    ])
  )
  const betUsersByDay = Object.fromEntries(
    dailyBets.map((bets) => [bets.day, bets.values.map((b) => b.userId)])
  )
  const commentUsersByDay = Object.fromEntries(
    dailyComments.map((comments) => [
      comments.day,
      comments.values.map((c) => c.userId),
    ])
  )

  // average actions
  {
    const allIds = mergeWith(
      contractUsersByDay,
      betUsersByDay,
      commentUsersByDay,
      (a, b) => (a && b ? a.concat(b) : a || b)
    )

    const medianDailyUserActions = mapValues(allIds, (ids) => {
      const userIdCounts = countBy(ids, (id) => id)
      const countsFiltered = Object.values(userIdCounts).filter((c) => c > 1)
      return countsFiltered.length === 0 ? 0 : median(countsFiltered)
    })

    log('upsert "average" daily user actions')
    await bulkUpsertStats(
      pg,
      Object.entries(medianDailyUserActions).map(([day, median]) => ({
        start_date: day,
        avg_user_actions: median,
      }))
    )
  }

  const contractBetOrCommentUniqueUsersByDay = mergeWith(
    betUsersByDay,
    contractUsersByDay,
    commentUsersByDay,
    (a, b) => {
      if (!a && !b) return []
      if (!a) return b
      if (!b) return a
      return uniq([...a, ...b])
    }
  )

  // stats using weird stricter dau calculation that only includes contracts, comments, users

  const dailyUserIds = Object.entries(contractBetOrCommentUniqueUsersByDay)
    .map(([day, values]) => ({ day, values }))
    .sort((a, b) => a.day.localeCompare(b.day))

  log('upsert dau, wau, mau, d1, w1, m1')

  await bulkUpsertStats(
    pg,
    dailyUserIds
      .map((today, i) => ({
        start_date: today.day,
        dau: today.values.length,
        wau: uniqBetween(dailyUserIds, i - 6, i + 1).length,
        mau: uniqBetween(dailyUserIds, i - 29, i + 1).length,
        d1: i == 0 ? 0 : retention(dailyUserIds[i - 1].values, today.values),
        w1: retention(
          uniqBetween(dailyUserIds, i - 13, i - 6), // 2 weeks ago
          uniqBetween(dailyUserIds, i - 6, i + 1) // last week
        ),
        m1: retention(
          uniqBetween(dailyUserIds, i - 59, i - 29), // 2 months ago
          uniqBetween(dailyUserIds, i - 29, i + 1) // last month
        ),
      }))
      .slice(bufferDays)
  )

  log('upsert engaged users')
  {
    const getTwiceActive = (
      dailyActiveIds: { day: string; values: string[] }[]
    ) => {
      const allIds = dailyActiveIds.flatMap((d) => d.values)
      const counts = countBy(allIds, (id) => id)
      return Object.keys(pickBy(counts, (count) => count >= 2))
    }

    const engagedUsers = dailyUserIds
      .map(({ day }, i) => {
        const start = Math.max(0, i - 20)
        const week1 = Math.max(0, i - 13)
        const week2 = Math.max(0, i - 6)
        const end = i + 1

        const engaged1 = getTwiceActive(dailyUserIds.slice(start, week1))
        const engaged2 = getTwiceActive(dailyUserIds.slice(week1, week2))
        const engaged3 = getTwiceActive(dailyUserIds.slice(week2, end))
        return {
          start_date: day,
          engaged_users: intersection(engaged1, engaged2, engaged3).length,
        }
      })
      .slice(bufferDays)

    await bulkUpsertStats(pg, engagedUsers)
  }

  // new user stats
  {
    log('fetch daily new users')
    const dailyNewUsers = await getDailyNewUsers(pg, startWithBuffer, end)

    log('upsert signups')
    await bulkUpsertStats(
      pg,
      dailyNewUsers.map((users) => ({
        start_date: users.day,
        signups: users.values.length,
      }))
    )

    const dailyNewRealUsers = dailyNewUsers.map(({ day, values }) => ({
      day,
      values: values.filter((u) => !isUserLikelySpammer(u)),
    }))

    const dailyNewRealUserIds = dailyNewRealUsers.map(({ day, values }) => ({
      day,
      values: values.map((u) => u.id),
    }))

    log('upsert real new user stats')
    await bulkUpsertStats(
      pg,
      dailyNewRealUserIds
        .map(({ day, values: users }, i) => ({
          start_date: day,
          signups_real: users.length,
          nd1: retention(users, dailyUserIds[i + 1]?.values),
          nw1: retention(
            uniqBetween(dailyNewRealUserIds, i - 13, i - 6), // new users 2 weeks ago
            uniqBetween(dailyUserIds, i - 6, i + 1) // active users last week
          ),
        }))
        .slice(bufferDays)
    )

    log('upsert new user bets')

    const newUsersBets = dailyNewRealUsers
      .map(({ day, values: users }, i) => ({
        start_date: day,
        activation: average(users.map((u) => (u.d1BetCount > 0 ? 1 : 0))),
        d1_bet_average: average(users.map((u) => u.d1BetCount)),
        d1_bet_3_day_average: average(
          dailyNewRealUsers
            .slice(i - 2, i + 1)
            .map((u) => average(u.values.map((u) => u.d1BetCount)))
        ),
      }))
      .slice(2)

    await bulkUpsertStats(pg, newUsersBets)

    log('upsert % active d1 to d3')
    const fracDaysActiveD1ToD3 = dailyNewRealUserIds
      .slice(0, -3)
      .map(({ day, values: today }, i) => {
        const week = dailyUserIds.slice(i + 1, i + 4).flatMap((d) => d.values)
        const counts = countBy(week, (id) => id)

        return {
          start_date: day,
          active_d1_to_d3: average(today.map((id) => counts[id] ?? 0)) / 3,
        }
      })

    await bulkUpsertStats(pg, fracDaysActiveD1ToD3)
  }

  log('calculate topic DAUs')
  const topicDaus = await calculateTopicDaus(pg, start, end)

  await bulkUpsertStats(
    pg,
    Object.entries(topicDaus).map(([date, topicCounts]) => ({
      start_date: date,
      topic_daus: topicCounts,
    }))
  )
}

const isUserLikelySpammer = (user: StatUser) =>
  !user.d1BetCount &&
  (user.bioIsLong || !!user.freeQuestionsCreated || !!user.dashboardCount)

async function updateDailySales(
  pg: SupabaseDirectClient,
  start: string,
  end: string
) {
  log('fetch daily sales')
  const sales = await pg.manyOrNone<{ start_date: string; sales: number }>(
    `select
      date_trunc('day', created_time at time zone 'america/los_angeles')::date as start_date,
      sum(
        case when created_time > $3 and created_time < $4 then amount / 1000 else amount / 100 end
      ) as sales
    from txns
      where category = 'MANA_PURCHASE'
      and created_time >= date_to_midnight_pt($1)
      and created_time < date_to_midnight_pt($2)
    group by start_date
    order by start_date asc`,
    [
      start,
      end,
      MANA_PURCHASE_RATE_CHANGE_DATE.toISOString(),
      MANA_PURCHASE_RATE_REVERT_DATE.toISOString(),
    ]
  )

  log('upsert daily sales')
  await bulkUpsertStats(pg, sales)
  await pg.none(
    `update daily_stats set sales = 0 where sales is null and start_date >= $1 and start_date < $2`,
    [start, end]
  )
}

async function updateDailyCashSales(
  pg: SupabaseDirectClient,
  start: string,
  end: string
) {
  log('fetch daily sales')
  const sales = await pg.manyOrNone<{ start_date: string; sales: number }>(
    `select
      date_trunc('day', created_time at time zone 'america/los_angeles')::date as start_date,
      sum(amount) as cash_sales
    from txns
      where category = 'CASH_BONUS'
      and created_time >= date_to_midnight_pt($1)
      and created_time < date_to_midnight_pt($2)
    group by start_date
    order by start_date asc`,
    [start, end]
  )

  log('upsert daily cash sales')
  await bulkUpsertStats(pg, sales)
  await pg.none(
    `update daily_stats set cash_sales = 0 where cash_sales is null and start_date >= $1 and start_date < $2`,
    [start, end]
  )
}

async function updateConversionScores(
  pg: SupabaseDirectClient,
  start: string,
  end: string
) {
  log('fetch feed conversion')
  const scores = await getFeedConversionScores(pg, start, end)
  log('upsert feed conversion')
  await bulkUpsertStats(pg, scores)
}

const retention = (
  cohort1: string[] | undefined,
  cohort2: string[] | undefined
) => {
  if (!cohort1 || !cohort2) return undefined
  return average(cohort1.map((id) => (cohort2.includes(id) ? 1 : 0)))
}

// sum of distinct [start, end)
const uniqBetween = <T = any>(
  arr: { day: string; values: T[] }[],
  start: number,
  end: number
) => uniq(arr.slice(start, end).flatMap(({ values }) => values))

const bulkUpsertStats = async (
  pg: SupabaseDirectClient,
  stats: Tables['daily_stats']['Insert'][]
) => {
  await bulkUpsert(
    pg,
    'daily_stats',
    'start_date',
    stats
    // TODO: no on conflict to fix bad values, if you insert bad values you have to delete them!!
  )
}

async function calculateTopicDaus(
  pg: SupabaseDirectClient,
  start: string,
  end: string
) {
  // Get daily active users per group with 50+ users filter
  const dailyGroupUsers = await pg.manyOrNone<{
    day: string
    group_counts: Record<string, number>
  }>(
    `
    with daily_active as (
      select 
        date_trunc('day', b.created_time at time zone 'america/los_angeles')::date as day,
        b.user_id,
        gc.group_id
      from contract_bets b
      join contracts c on b.contract_id = c.id 
      join group_contracts gc on c.id = gc.contract_id
      where b.created_time >= date_to_midnight_pt($1)
        and b.created_time < date_to_midnight_pt($2)
      union
      select 
        date_trunc('day', cc.created_time at time zone 'america/los_angeles')::date as day,
        user_id,
        gc.group_id
      from contract_comments cc
      join contracts c on cc.contract_id = c.id
      join group_contracts gc on c.id = gc.contract_id
      where cc.created_time >= date_to_midnight_pt($1)
        and cc.created_time < date_to_midnight_pt($2)
      union
      select
        date_trunc('day', created_time at time zone 'america/los_angeles')::date as day,
        creator_id as user_id,
        gc.group_id
      from contracts c
      join group_contracts gc on c.id = gc.contract_id
      where c.created_time >= date_to_midnight_pt($1)
        and c.created_time < date_to_midnight_pt($2)
    ),
    group_counts as (
      select 
        day,
        group_id,
        count(distinct user_id) as user_count
      from daily_active
      group by day, group_id
      having count(distinct user_id) > 50
    )
    select 
      day,
      jsonb_object_agg(group_id, user_count) as group_counts
    from group_counts
    group by day
  `,
    [start, end]
  )

  // Convert to the expected format
  return Object.fromEntries(
    dailyGroupUsers.map(({ day, group_counts }) => [day, group_counts])
  )
}

export const updateCashActivityStats = async (
  pg: SupabaseDirectClient,
  start: string,
  end: string
) => {
  const startWithBuffer = dayjs(start)
    .subtract(bufferDays, 'days')
    .format('YYYY-MM-DD')

  log(
    `Fetching data for cash activity stats between ${startWithBuffer} and ${end}`
  )
  const [dailyBets, dailyContracts, dailyComments] = await Promise.all([
    getDailyBets(pg, startWithBuffer, end, 'CASH'),
    getDailyContracts(pg, startWithBuffer, end, 'CASH'),
    getDailyComments(pg, startWithBuffer, end, 'CASH'),
  ])
  logMemory()

  log('upsert cash bets counts and totals')
  await bulkUpsertStats(
    pg,
    dailyBets.map((bets) => ({
      start_date: bets.day,
      cash_bet_count: bets.values.length,
      cash_bet_amount: sum(bets.values.map((b) => b.amount)),
    }))
  )

  log('upsert cash contract counts')
  await bulkUpsertStats(
    pg,
    dailyContracts.map((contracts) => ({
      start_date: contracts.day,
      cash_contract_count: contracts.values.length,
    }))
  )

  log('upsert comment counts')
  await bulkUpsertStats(
    pg,
    dailyComments.map((comments) => ({
      start_date: comments.day,
      cash_comment_count: comments.values.length,
    }))
  )

  // unique ids across contract, bet, and comment actions
  const contractUsersByDay = Object.fromEntries(
    dailyContracts.map((contracts) => [
      contracts.day,
      contracts.values.map((c) => c.userId),
    ])
  )
  const betUsersByDay = Object.fromEntries(
    dailyBets.map((bets) => [bets.day, bets.values.map((b) => b.userId)])
  )
  const commentUsersByDay = Object.fromEntries(
    dailyComments.map((comments) => [
      comments.day,
      comments.values.map((c) => c.userId),
    ])
  )

  // average actions
  {
    const allIds = mergeWith(
      contractUsersByDay,
      betUsersByDay,
      commentUsersByDay,
      (a, b) => (a && b ? a.concat(b) : a || b)
    )

    const medianDailyUserActions = mapValues(allIds, (ids) => {
      const userIdCounts = countBy(ids, (id) => id)
      const countsFiltered = Object.values(userIdCounts).filter((c) => c > 1)
      return countsFiltered.length === 0 ? 0 : median(countsFiltered)
    })

    log('upsert "average" cash daily user actions')
    await bulkUpsertStats(
      pg,
      Object.entries(medianDailyUserActions).map(([day, median]) => ({
        start_date: day,
        cash_avg_user_actions: median,
      }))
    )
  }

  const contractBetOrCommentUniqueUsersByDay = mergeWith(
    betUsersByDay,
    contractUsersByDay,
    commentUsersByDay,
    (a, b) => {
      if (!a && !b) return []
      if (!a) return b
      if (!b) return a
      return uniq([...a, ...b])
    }
  )

  // stats using weird stricter dau calculation that only includes contracts, comments, users

  const dailyUserIds = Object.entries(contractBetOrCommentUniqueUsersByDay)
    .map(([day, values]) => ({ day, values }))
    .sort((a, b) => a.day.localeCompare(b.day))

  log('upsert cash dau, wau, mau, d1, w1, m1')

  await bulkUpsertStats(
    pg,
    dailyUserIds
      .map((today, i) => ({
        start_date: today.day,
        cash_dau: today.values.length,
        cash_wau: uniqBetween(dailyUserIds, i - 6, i + 1).length,
        cash_mau: uniqBetween(dailyUserIds, i - 29, i + 1).length,
        cash_d1:
          i == 0 ? 0 : retention(dailyUserIds[i - 1].values, today.values),
        cash_w1: retention(
          uniqBetween(dailyUserIds, i - 13, i - 6), // 2 weeks ago
          uniqBetween(dailyUserIds, i - 6, i + 1) // last week
        ),
        cash_m1: retention(
          uniqBetween(dailyUserIds, i - 59, i - 29), // 2 months ago
          uniqBetween(dailyUserIds, i - 29, i + 1) // last month
        ),
      }))
      .slice(bufferDays)
  )
}
