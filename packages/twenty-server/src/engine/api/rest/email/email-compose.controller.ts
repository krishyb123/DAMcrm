import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

import { JwtAuthGuard } from 'src/engine/guards/jwt.auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { EmailComposeService } from 'src/engine/api/rest/email/email-compose.service';
import { type AuthenticatedRequest } from 'src/engine/api/rest/types/authenticated-request';

@Controller('rest/email')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
@UseFilters(RestApiExceptionFilter)
export class EmailComposeController {
  constructor(private readonly emailComposeService: EmailComposeService) {}

  @Get('connected-accounts')
  async getConnectedAccounts(
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const accounts = await this.emailComposeService.getConnectedAccounts(
      request.workspace.id,
      request.workspaceMemberId,
    );

    res.status(200).json({ data: accounts });
  }

  @Post('send')
  async sendEmail(
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
    @Body()
    body: {
      connectedAccountId: string;
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
    },
  ) {
    await this.emailComposeService.sendEmail(
      request.workspace.id,
      request.workspaceMemberId,
      body,
    );

    res.status(200).json({ success: true });
  }

  @Post('draft')
  async createDraft(
    @Req() request: AuthenticatedRequest,
    @Res() res: Response,
    @Body()
    body: {
      connectedAccountId: string;
      to: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
    },
  ) {
    await this.emailComposeService.createDraft(
      request.workspace.id,
      request.workspaceMemberId,
      body,
    );

    res.status(200).json({ success: true });
  }
}
