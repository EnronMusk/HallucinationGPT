import { Message, MessageAgent } from '@/cohere-client';
import { BotMessage, BotState, MessageType, UserMessage } from '@/types/message';
import { replaceTextWithCitations } from '@/utils/citations';

//

//this thing is mapping the db message to a chat message

//
export const mapHistoryToMessages = (conversation_id: string, history?: Message[]) => {
  return history
    ? history.map<UserMessage | BotMessage>((message) => {
        return {
          ...(message.agent === MessageAgent.CHATBOT
            ? { type: MessageType.BOT, state: BotState.FULFILLED, originalText: message.text ?? '' }
            : { type: MessageType.USER, }),
          text: replaceTextWithCitations(
            message.text ?? '',
            message.citations ?? [],
            message.generation_id ?? ''
          ),
          generationId: message.generation_id ?? '',
          citations: message.citations,
          files: message.files,
          message_id: message.id,
          conversation_id: conversation_id,
          annotations: message.annotations,
          is_annotation_response: message.is_annotation_response||false,
        };
      })
    : [];
};
