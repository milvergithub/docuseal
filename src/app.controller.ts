import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import TelegramBot from 'node-telegram-bot-api';
import { Web3Storage } from 'web3.storage';
import * as fs from 'fs';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('/api/v1/documents')
export class AppController {
  private bot: TelegramBot;

  constructor(private readonly appService: AppService) {
    const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_DEFAULT_TOKEN';
    this.bot = new TelegramBot(token, { polling: true });

    // Listen for incoming messages
    this.bot.on('message', (msg) => {
      console.log('Received message:', msg);
      if (msg.text) {
        this.bot.sendMessage(msg.chat.id, 'Hello 👋, I received your message');
      }
    });
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Endpoint to upload a file and send it to Telegram
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const chatId = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';

    // Send file directly from memory
    await this.bot.sendDocument(
      chatId,
      file.buffer,
      {},
      {
        filename: file.originalname,
      },
    );

    return {
      message: 'File sent to Telegram',
      file: file.originalname,
    };
  }

  // Web3.Storage helper methods
  getAccessToken() {
    return process.env.WEB3STORAGE_TOKEN;
  }

  makeStorageClient() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
    return new Web3Storage({ token: this.getAccessToken() });
  }

  async storeDocument(path: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const client = this.makeStorageClient();
    const content = await fs.promises.readFile(path);

    // Create a File object to send to Web3.Storage
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const files = [new File([content], 'document.pdf')];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const cid = await client.put(files);

    console.log('📦 Uploaded to Filecoin/IPFS with CID:', cid);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cid;
  }
}
