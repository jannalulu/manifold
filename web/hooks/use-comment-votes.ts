import { Reaction, ReactionContentTypes } from 'common/reaction'
import { db } from 'web/lib/supabase/db'
import { useEffect } from 'react'
import { run } from 'common/supabase/utils'
import { usePersistentInMemoryState } from './use-persistent-in-memory-state'

export const useVotesOnComment = (
  contentType: ReactionContentTypes,
  commentId: string
) => {
  const [votes, setVotes] = usePersistentInMemoryState<Reaction[] | undefined>(
    undefined,
    `${contentType}-votes-on-${commentId}`
  )

  useEffect(() => {
    run(
      db
        .from('user_reactions')
        .select()
        .eq('content_type', "comment")
        .eq('content_id', commentId)
        .or('reaction_types.eq.upvote,reaction_types.eq.downvote')
    ).then(({ data }) => setVotes(data))
  }, [commentId])

  return votes
}