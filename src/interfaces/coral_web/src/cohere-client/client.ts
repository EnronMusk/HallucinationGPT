import { FetchEventSourceInit, fetchEventSource } from '@microsoft/fetch-event-source';

import {
  Body_upload_file_v1_conversations_upload_file_post,
  CancelablePromise,
  CohereChatRequest,
  CohereClientGenerated,
  CohereNetworkError,
  CreateAgent,
  CreateSnapshot,
  CreateUser,
  ExperimentalFeatures,
  Fetch,
  UpdateAgent,
  UpdateConversation,
  UpdateDeploymentEnv,
} from '@/cohere-client';

import { mapToChatRequest } from './mappings';


export class CohereClient {
  private readonly hostname: string;
  private readonly fetch: Fetch;
  private authToken?: string;

  public cohereService: CohereClientGenerated;
  public request?: any;

  constructor({
    hostname,
    fetch,
    authToken,
  }: {
    hostname: string;
    fetch: Fetch;
    authToken?: string;
  }) {
    this.hostname = hostname;
    this.fetch = fetch;
    this.authToken = authToken;
    this.cohereService = new CohereClientGenerated({
      BASE: hostname,
      HEADERS: this.getHeaders(true),
    });
  }

  public uploadFile(formData: Body_upload_file_v1_conversations_upload_file_post) {
    return this.cohereService.default.uploadFileV1ConversationsUploadFilePost({
      formData,
    });
  }

  public deletefile({ conversationId, fileId }: { conversationId: string; fileId: string }) {
    return this.cohereService.default.deleteFileV1ConversationsConversationIdFilesFileIdDelete({
      conversationId,
      fileId,
    });
  }

  public listFiles({ conversationId }: { conversationId: string }) {
    return this.cohereService.default.listFilesV1ConversationsConversationIdFilesGet({
      conversationId,
    });
  }

  public async chat({
    request,
    headers,
    agentId,
    signal,
    onOpen,
    onMessage,
    onClose,
    onError,
  }: {
    request: CohereChatRequest;
    headers?: Record<string, string>;
    agentId?: string;
    signal?: AbortSignal;
    onOpen?: FetchEventSourceInit['onopen'];
    onMessage?: FetchEventSourceInit['onmessage'];
    onClose?: FetchEventSourceInit['onclose'];
    onError?: FetchEventSourceInit['onerror'];
  }) {
    const chatRequest = mapToChatRequest(request);
    const requestBody = JSON.stringify({
      ...chatRequest,
    });

    const endpoint = `${this.getEndpoint('chat-stream')}${agentId ? `?agent_id=${agentId}` : ''}`;
    console.log("UMSG ID",chatRequest.user_msg_id)
    console.log("BMSG ID",chatRequest.bot_msg_id)
    return await fetchEventSource(endpoint, {
      method: 'POST',
      headers: { ...this.getHeaders(), ...headers },
      body: requestBody,
      signal,
      onopen: onOpen,
      onmessage: onMessage,
      onclose: onClose,
      onerror: onError,
    });
  }

  public async langchainChat({
    request,
    headers,
    signal,
    onOpen,
    onMessage,
    onClose,
    onError,
  }: {
    request: CohereChatRequest;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    onOpen?: FetchEventSourceInit['onopen'];
    onMessage?: FetchEventSourceInit['onmessage'];
    onClose?: FetchEventSourceInit['onclose'];
    onError?: FetchEventSourceInit['onerror'];
  }) {
    const chatRequest = mapToChatRequest(request);
    const requestBody = JSON.stringify({
      ...chatRequest,
    });
    return await fetchEventSource(this.getEndpoint('langchain-chat'), {
      method: 'POST',
      headers: { ...this.getHeaders(), ...headers },
      body: requestBody,
      signal,
      onopen: onOpen,
      onmessage: onMessage,
      onclose: onClose,
      onerror: onError,
    });
  }

  public listConversations(params: { offset?: number; limit?: number; agentId?: string }) {
    return this.cohereService.default.listConversationsV1ConversationsGet(params);
  }

  public getConversation({ conversationId }: { conversationId: string }) {
    return this.cohereService.default.getConversationV1ConversationsConversationIdGet({
      conversationId,
    });
  }

  public deleteConversation({ conversationId }: { conversationId: string }) {
    return this.cohereService.default.deleteConversationV1ConversationsConversationIdDelete({
      conversationId,
    });
  }

  public editConversation(requestBody: UpdateConversation, conversationId: string) {
    return this.cohereService.default.updateConversationV1ConversationsConversationIdPut({
      conversationId: conversationId,
      requestBody,
    });

  }

  //deletes annotations
  public async deleteAnnotation(annotation_id: string ): Promise<void> {
    const response = await this.fetch(`${this.getEndpoint('annotations')}/${annotation_id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    const body = await response.json();

    if (response.status !== 200) {
      throw new CohereNetworkError(
        body?.message || body?.error || 'Something went wrong',
        response.status
      );
    }
  }

  public updateDeploymentEnvVariables(requestBody: UpdateDeploymentEnv, name: string) {
    return this.cohereService.default.setEnvVarsV1DeploymentsNameSetEnvVarsPost({
      name: name,
      requestBody,
    });
  }

  public login({ email, password }: { email: string; password: string }) {
    return this.cohereService.default.loginV1LoginPost({
      requestBody: {
        strategy: 'Basic',
        payload: { email, password },
      },
    });
  }

  public logout() {
    return this.cohereService.default.logoutV1LogoutGet();
  }

  public getAuthStrategies() {
    return this.cohereService.default.getStrategiesV1AuthStrategiesGet();
  }

  public createUser(requestBody: CreateUser) {
    return this.cohereService.default.createUserV1UsersPost({
      requestBody,
    });
  }

  //


  //For adding annotations!

  //

  public async annotate(
    annotation_id: string,
    annotationRequest: {
      message_id: string,
      htext: string,
      annotation: string,
      start: number,
      end: number
    }): Promise<void>  {
    const endpoint = `${this.getEndpoint('annotations')}/${annotation_id}/add`;
    const requestBody = {
      message_id: annotationRequest.message_id,
      htext: annotationRequest.htext,
      annotation: annotationRequest.annotation,
      start: annotationRequest.start,
      end: annotationRequest.end
    };
  
    const response = await this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
      headers: this.getHeaders(),
    });

    //const body = await response.json();
  }

  public async googleSSOAuth({ code }: { code: string }) {
    const response = await this.fetch(`${this.getEndpoint('google/auth')}?code=${code}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const body = await response.json();

    if (response.status !== 200) {
      throw new CohereNetworkError('Something went wrong', response.status);
    }

    return body as { token: string };
    // FIXME(@tomtobac): generated code doesn't have code as query parameter (TLK-765)
    // this.cohereService.default.googleAuthorizeV1GoogleAuthGet();
  }

  public listTools({ agentId }: { agentId?: string | null }) {
    return this.cohereService.default.listToolsV1ToolsGet({ agentId });
  }

  public listDeployments({ all }: { all?: boolean }) {
    return this.cohereService.default.listDeploymentsV1DeploymentsGet({ all });
  }


  private getEndpoint(endpoint: 'chat-stream' | 'langchain-chat' | 'google/auth' | 'oidc/auth' | 'annotations') {
    return `${this.hostname}/v1/${endpoint}`;
  }

  private getHeaders(omitContentType = false) {
    const headers: HeadersInit = {
      ...(omitContentType ? {} : { 'Content-Type': 'application/json' }),
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      'User-Id': 'user-id', //this.source
    };
    return headers;
  }
}




