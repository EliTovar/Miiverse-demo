import { 
  ChangeDetectionStrategy, 
  Component, 
  ElementRef, 
  ViewChild, 
  AfterViewInit 
} from '@angular/core';
import { SceneManager } from './three/SceneManager';
import { SocketService } from '../../../../../core/socket/socket.service';

@Component({
  selector: 'ia-administrator',
  templateUrl: './IA-administrator.html',
  styleUrl: './IA-administrator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IAAdministrator implements AfterViewInit {
  constructor(private socketService: SocketService) {}

  @ViewChild('canvasContainer', { static: true })
  
  containerRef!: ElementRef<HTMLDivElement>;

  sceneManager!: SceneManager;

  // ngAfterViewInit(): void {
  //   this.sceneManager = new SceneManager(
  //     this.containerRef.nativeElement,
  //     false // 👈 desactiva controles
  //   );

  //   this.animate();
  // }

  ngAfterViewInit(): void {
    this.socketService.connect();

    this.sceneManager = new SceneManager(
      this.containerRef.nativeElement,
      false
    );

    // CENTRALIZAR RESPUESTAS
    this.socketService.on('ai-response', (data: any) => {
      console.log('🧠 IA Response:', data.text);
      
      // Siempre detener el estado de pensamiento
      this.sceneManager.cube.setThinking(false);

      this.sceneManager.labels.showLabel(
        this.sceneManager.cube.mesh,
        (data.isError ? "❌ " : "🧠 ") + data.text
      );
    });

    this.animate();
  }

  ngOnInit() {
    // Ya no es necesario el listener extra aquí
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.sceneManager.render();
  }

  

  sendMessage(event: any) {
    const value = event.target.value;

    if (!value.trim()) return;

    console.log('[DEBUG-FRONT] 📤 Intentando enviar mensaje:', value);
    
    if (!this.socketService.getSocket()?.connected) {
      console.warn('[DEBUG-FRONT] ⚠️ Socket NO conectado al intentar enviar');
      this.sceneManager.labels.showLabel(
        this.sceneManager.cube.mesh,
        "⚠️ Error: No hay conexión con el servidor"
      );
      return;
    }

    // Mostrar mensaje usuario
    this.sceneManager.labels.showLabel(
      this.sceneManager.cube.mesh,
      "👤 " + value
    );

    // 🔥 Enviar al backend
    this.socketService.emit('ai-message', {
      message: value,
    });

    // Mostrar estado de pensamiento
    this.sceneManager.labels.showLabel(
      this.sceneManager.cube.mesh,
      "⚡ Analizando protocolos..."
    );
    this.sceneManager.cube.setThinking(true);

    event.target.value = '';
  }
}
