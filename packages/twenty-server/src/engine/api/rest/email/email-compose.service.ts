import { Injectable, NotFoundException } from '@nestjs/common';

import { ConnectedAccountProvider } from 'twenty-shared/types';

import { ConnectedAccountDataAccessService } from 'src/engine/metadata-modules/connected-account/data-access/services/connected-account-data-access.service';
import { type ConnectedAccountWorkspaceEntity } from 'src/modules/connected-account/standard-objects/connected-account.workspace-entity';
import { MessagingMessageOutboundService } from 'src/modules/messaging/message-outbound-manager/services/messaging-message-outbound.service';
import { type SendMessageInput } from 'src/modules/messaging/message-outbound-manager/types/send-message-input.type';

interface ComposeEmailInput {
  connectedAccountId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailComposeService {
  constructor(
    private readonly connectedAccountDataAccessService: ConnectedAccountDataAccessService,
    private readonly messagingMessageOutboundService: MessagingMessageOutboundService,
  ) {}

  async getConnectedAccounts(
    workspaceId: string,
    workspaceMemberId: string,
  ): Promise<
    Pick<ConnectedAccountWorkspaceEntity, 'id' | 'handle' | 'provider'>[]
  > {
    const accounts = await this.connectedAccountDataAccessService.find(
      workspaceId,
      { accountOwnerId: workspaceMemberId },
    );

    return accounts
      .filter(
        (account) =>
          account.provider === ConnectedAccountProvider.GOOGLE ||
          account.provider === ConnectedAccountProvider.MICROSOFT ||
          account.provider === ConnectedAccountProvider.IMAP_SMTP_CALDAV,
      )
      .map((account) => ({
        id: account.id,
        handle: account.handle,
        provider: account.provider,
      }));
  }

  async sendEmail(
    workspaceId: string,
    workspaceMemberId: string,
    input: ComposeEmailInput,
  ): Promise<void> {
    const connectedAccount = await this.getConnectedAccount(
      workspaceId,
      workspaceMemberId,
      input.connectedAccountId,
    );

    const sendMessageInput = this.buildSendMessageInput(input);

    await this.messagingMessageOutboundService.sendMessage(
      sendMessageInput,
      connectedAccount,
    );
  }

  async createDraft(
    workspaceId: string,
    workspaceMemberId: string,
    input: ComposeEmailInput,
  ): Promise<void> {
    const connectedAccount = await this.getConnectedAccount(
      workspaceId,
      workspaceMemberId,
      input.connectedAccountId,
    );

    const sendMessageInput = this.buildSendMessageInput(input);

    await this.messagingMessageOutboundService.createDraft(
      sendMessageInput,
      connectedAccount,
    );
  }

  private async getConnectedAccount(
    workspaceId: string,
    workspaceMemberId: string,
    connectedAccountId: string,
  ): Promise<ConnectedAccountWorkspaceEntity> {
    const account = await this.connectedAccountDataAccessService.findOne(
      workspaceId,
      {
        where: {
          id: connectedAccountId,
          accountOwnerId: workspaceMemberId,
        },
      },
    );

    if (!account) {
      throw new NotFoundException('Connected account not found');
    }

    return account;
  }

  private buildSendMessageInput(input: ComposeEmailInput): SendMessageInput {
    return {
      to: input.to,
      cc: input.cc || undefined,
      bcc: input.bcc || undefined,
      subject: input.subject,
      body: input.body,
      html: input.body,
    };
  }
}
