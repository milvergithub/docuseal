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
import * as fs from 'node:fs';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('/api/v1/documents')
export class AppController {
  private bot: TelegramBot;
  constructor(private readonly appService: AppService) {
    //ME 8459400352:AAEe9OPCYRRmFlpr9MjqHbYipIrqW3XAcbI
    // 8396574258:AAHnwgp_We0-yXwJCRHDFX5gJjH_UrbsV5M
    const token = '8459400352:AAEe9OPCYRRmFlpr9MjqHbYipIrqW3XAcbI';
    this.bot = new TelegramBot(token, { polling: true });

    // Listener de mensajes de texto
    this.bot.on('message', (msg) => {
      console.log(msg);
      if (msg.text) {
        this.bot.sendMessage(msg.chat.id, 'Hola 👋, recibí tu mensaje');
      }
    });
  }

  @Get('')
  getHello(): string {
    return this.appService.getHello();
  }

  // 👉 Endpoint para subir un archivo y enviarlo a Telegram
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    // Aquí defines a qué chat lo mandas (por ejemplo, tu propio ID)
    const chatId = '630724184'; // tu chatId real

    // Enviar archivo directamente desde memoria, sin guardarlo en disco
    await this.bot.sendDocument(
      chatId,
      file.buffer,
      {},
      { filename: file.originalname },
    );

    return {
      message: 'Archivo enviado a Telegram',
      file: file.originalname,
    };
  }

  getAccessToken() {
    return process.env.WEB3STORAGE_TOKEN; // pon tu token en variables de entorno
  }

  makeStorageClient() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
    return new Web3Storage({ token: this.getAccessToken() });
  }

  async storeDocument(path) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const client = this.makeStorageClient();
    const content = await fs.promises.readFile(path);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const files = [new File([content], 'documento.pdf')];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const cid = await client.put(files);
    console.log('📦 Subido a Filecoin/IPFS con CID:', cid);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return cid;
  }
}
