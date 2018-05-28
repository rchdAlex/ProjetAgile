import { createServer, Server } from 'http';
import * as express from 'express';
import * as socketIo from 'socket.io';
import * as mongoose from 'mongoose';
import { ChatMessage } from './model/chat-message';
import { User } from './model/user';
import { Document, Schema, Model, model} from "mongoose";
import { prop, Typegoose, ModelType, InstanceType } from 'typegoose';

class IMessage extends Typegoose {
    @prop()
    user?: User;
    @prop()
    content?: string;
}

const MessageModel = new IMessage().getModelForClass(IMessage, { existingMongoose: mongoose });

export class ChatServer {
    public static readonly PORT:number = 8080;
    private app: express.Application;
    private server: Server;
    private io: SocketIO.Server;
    private port: string | number;

    constructor() {
        this.createApp();
        this.config();
        this.createServer();
        this.sockets();
        this.listen();
    }

    private connectMongo():void {
      mongoose.connect('mongodb://localhost:27017/agile', (err) => {
        if(err) {
          console.log(err);
        }
      });
    }

    private createApp(): void {
        this.app = express();
    }

    private createServer(): void {
        this.server = createServer(this.app);
    }

    private config(): void {
        this.port = process.env.PORT || ChatServer.PORT;
    }

    private sockets(): void {
        this.io = socketIo(this.server);
    }

    private listen(): void {
        this.server.listen(this.port, () => {
            console.log('Running server on port %s', this.port);
        });

        this.io.on('connect', (socket: any) => {
            console.log('Connected client on port %s.', this.port);
            socket.on('message', (m: ChatMessage) => {
                const message = new MessageModel({
                  user: m.from.name,
                  content: m.content
                })
                message.save();
                const savedMessage = MessageModel.findOne({'user': m.from.name}, (err, message) => {
                  console.log('saved : ' + message.content);
                })
                console.log('[server](message): %s', JSON.stringify(m));
                this.io.emit('message', m);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}
