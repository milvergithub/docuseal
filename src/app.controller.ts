import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import TelegramBot from 'node-telegram-bot-api';
import { Client, create } from '@storacha/client';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';

@Controller('/api/v1/documents')
export class AppController {
  private bot: TelegramBot;
  private client: Client;
  private spaceName = 'documents';

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

  // Inicializa cliente Storacha y espacio
  async initStoracha() {
    if (!this.client) {
      const token = process.env.STORACHA_TOKEN || '';
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this.client = await create({ token });
      await this.client.setCurrentSpace(<any>'documents');

      // Crear space si no existe y establecerlo como actual
      try {
        const space = await this.client.createSpace(this.spaceName);
        await this.client.setCurrentSpace(<any>space.name);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e: any) {
        // Si ya existe, solo setearlo
        await this.client.setCurrentSpace(<any>this.spaceName);
      }
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Endpoint to upload a file and send it to Telegram
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const chatId = process.env.TELEGRAM_CHAT_ID || '';

    // Send file directly from memory
    await this.bot.sendDocument(
      chatId,
      file.buffer,
      {},
      {
        filename: file.originalname,
      },
    );

    // 2️⃣ obtener el hash
    const pdfHash = this.getPdfHash(file.buffer);
    console.log(pdfHash);
    // 2️⃣ Subir archivo a Storacha
    await this.initStoracha();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const blob = new Blob([file.buffer]);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const cid = await this.client.uploadFile(blob, file.originalname);

    return {
      message: 'File sent to Telegram and uploaded to Web3.Storage',
      file: file.originalname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      cid,
      pdfHash,
    };
  }

  private getPdfHash(fileBuffer: Buffer): string {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }
}
