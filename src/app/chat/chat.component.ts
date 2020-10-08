import {Component, OnInit} from '@angular/core';
import {Client} from "@stomp/stompjs";
import * as SockJS from "sockjs-client";
import {Message} from "./model/Message";

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  client: Client;

  connecting: boolean = false;

  message: Message = new Message();
  messages: Message[] = [];

  writing: string;
  clientId: string;

  constructor() {
    this.clientId = 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2);
  }

  ngOnInit() {
    this.client = new Client();
    this.client.webSocketFactory = () => {
      return new SockJS("http://localhost:8080/chat-websocket");
    }

    this.client.onConnect = (frame) => {
      console.log('Connect: ' + this.client.connected + ' : ' + frame);
      this.client.activate();
      this.connecting = true;

      this.client.subscribe('/chat/message', e => {
        let message = JSON.parse(e.body) as Message;
        message.date = new Date(message.date);

        if (!this.message.color && message.type == 'NEW_USERNAME' && this.message.username == message.username) {
          this.message.color = message.color;
        }

        this.messages.push(message);
        console.log(message);
      });

      this.client.subscribe('/chat/writing', e => {
        this.writing = e.body;
        setTimeout(() => {
          this.writing = '';
        }, 3000)
      });

      this.client.subscribe('/chat/history/' + this.clientId, e => {
        const history = JSON.parse(e.body) as Message[];
        this.messages = history.map(m => {
          m.date = new Date(m.date);
          return m;
        }).reverse();
      });

      this.client.publish({destination: '/app/history', body: this.clientId});

      this.message.type = 'NEW_USERNAME';
      this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});

    }

    this.client.onDisconnect = (frame) => {
      console.log('Disconnect: ' + this.client.connected + ' : ' + frame);
      this.connecting = false;
      this.message = new Message();
      this.messages = [];
    }

  }

  connect(): void {
    this.client.activate();
  }

  disconnect(): void {
    this.client.deactivate();
  }

  sendMessage(): void {
    this.message.type = 'MESSAGE';
    this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    this.message.text = '';
  }

  writingEvent(): void {
    this.client.publish({destination: '/app/writing', body: JSON.stringify(this.message.username)});

  }
}
