import { DEFAULT_CHAT_TEMPERATURE } from './constants';
import { CohereChatRequest } from './generated';
import { v4 as uuidv4 } from 'uuid';

export const mapToChatRequest = (request: CohereChatRequest): CohereChatRequest => {
  return {
    message: request.message,
    bot_msg_id: request.bot_msg_id,
    user_msg_id: request.user_msg_id,
    model: request.model,
    temperature: request.temperature ?? DEFAULT_CHAT_TEMPERATURE,
    conversation_id: request.conversation_id,
    documents: request.documents,
    tools: request.tools,
    file_ids: request.file_ids,
  };
};
