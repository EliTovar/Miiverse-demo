import { Component, OnInit } from '@angular/core';
import { SocketService } from '../../services/socket.service';


@Component({
  selector: 'app-test-socket',
  template: `<button (click)="connect()">Conectar Socket</button>`,
})
export class TestSocketComponent {
  constructor(private socketService: SocketService) {}

  connect() {
    this.socketService.connect();
  }
}
