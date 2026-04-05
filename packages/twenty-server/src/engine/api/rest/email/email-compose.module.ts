import { Module } from '@nestjs/common';

import { ConnectedAccountDataAccessModule } from 'src/engine/metadata-modules/connected-account/data-access/connected-account-data-access.module';
import { EmailComposeController } from 'src/engine/api/rest/email/email-compose.controller';
import { EmailComposeService } from 'src/engine/api/rest/email/email-compose.service';
import { MessagingSendManagerModule } from 'src/modules/messaging/message-outbound-manager/messaging-send-manager.module';

@Module({
  imports: [MessagingSendManagerModule, ConnectedAccountDataAccessModule],
  controllers: [EmailComposeController],
  providers: [EmailComposeService],
})
export class EmailComposeModule {}
