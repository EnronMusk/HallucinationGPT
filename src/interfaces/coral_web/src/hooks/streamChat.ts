import { EventSourceMessage } from '@microsoft/fetch-event-source';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import {
  ChatResponseEvent as ChatResponse,
  CohereChatRequest,
  CohereFinishStreamError,
  CohereNetworkError,
  Conversation,
  FinishReason,
  StreamEnd,
  StreamEvent,
  isUnauthorizedError,
  useCohereClient,
} from '@/cohere-client';
import { useExperimentalFeatures } from '@/hooks/experimentalFeatures';

interface StreamingParams {
  onRead: (data: ChatResponse) => void;
  onHeaders: (headers: Headers) => void;
  onFinish: () => void;
  onError: (error: unknown) => void;
}

export interface StreamingChatParams extends StreamingParams {
  request: CohereChatRequest;
  headers: Record<string, string>;
  agentId?: string;
}

const getUpdatedConversations =
  (conversationId: string | undefined, description: string = '') =>
  (conversations: Conversation[] | undefined) => {
    return conversations?.map((c) => {
      if (c.id !== conversationId) return c;

      return {
        ...c,
        description,
        updatedAt: new Date().toISOString(),
      };
    });
  };

export const useStreamChat = (user_msg_id: string, bot_msg_id: string) => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const cohereClient = useCohereClient();
  const queryClient = useQueryClient();

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const retry = (failCount: number, error: CohereNetworkError) => {
    // we allow 1 retry for 401 errors
    if (isUnauthorizedError(error)) {
      return failCount < 1;
    }
    return false;
  };

  const updateConversationHistory = (data?: StreamEnd) => {
    if (!data) return;

    queryClient.setQueryData<Conversation[]>(
      ['conversations'],
      getUpdatedConversations(data?.conversation_id ?? '', data?.text)
    );
  };

  const chatMutation = useMutation<StreamEnd | undefined, CohereNetworkError, StreamingChatParams>({
    mutationFn: async (params: StreamingChatParams) => {
      try {
        queryClient.setQueryData<Conversation[]>(
          ['conversations'],
          getUpdatedConversations(params.request.conversation_id ?? '', params.request.message)
        );

        abortControllerRef.current = new AbortController();

        const { request, headers, onRead, onError, onFinish } = params;

        //

        //Here we assign user and bot msg ids. this is so streamingm essages have these ids!!!!

        //
        console.log("ijijijijijijijijijjijijjijijijijijijijijijijijijijijijijijijij")

        /////////

        //

        //Here we assign user and bot msg ids. this is so streamingm essages have these ids!!!!

        //
        console.log("ijijijijijijijijijjijijjijijijijijijijijijijijijijijijijijijij")

        /////////

        const chatStreamParams = {
          request,
          headers,
          signal: abortControllerRef.current.signal,
          onMessage: (event: EventSourceMessage) => {
            try {
              if (!event.data) return;
              const data = JSON.parse(event.data);

              if (data?.event === StreamEvent.STREAM_END) {
                const streamEndData = data.data as StreamEnd;

                if (streamEndData.finish_reason !== FinishReason.COMPLETE) {
                  throw new CohereFinishStreamError(streamEndData.finish_reason);
                }

                if (params.request.conversation_id) {
                  queryClient.setQueryData<Conversation[]>(
                    ['conversations'],
                    getUpdatedConversations(params.request.conversation_id, streamEndData.text)
                  );
                }
              }
              onRead(data);
            } catch (e) {
              console.error(e);
              throw new Error('unable to parse event data');
            }
          },
          onError: (err: any) => {
            onError(err);
            // Rethrow to stop the operation
            throw err;
          },
          onClose: () => {
            onFinish();
          },
        };

        ///

        ///

        /// this is hwere we assign the ids

        ///

        request.user_msg_id = user_msg_id //assign the ids we want for the messages!!!!
        request.bot_msg_id = bot_msg_id

        await cohereClient.chat({ ...chatStreamParams, agentId: params.agentId });
        
      } catch (e) {
        if (isUnauthorizedError(e)) {
          await queryClient.invalidateQueries({ queryKey: ['defaultAPIKey'] });
        }
        return Promise.reject(e);
      }
    },
    retry,
    onSuccess: updateConversationHistory,
  });
  console.log('before reutnr', user_msg_id)
  console.log('before reutnr', user_msg_id)

  return {
    chatMutation,
    abortController: abortControllerRef,
  };
};

