import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as THREE from 'three';

import { SceneManager } from '../../three/core/SceneManager';
import { RendererManager } from '../../three/core/RendererManager';
import { CameraManager } from '../../three/core/CameraManager';
import { CameraBoundaryManager } from '../../three/controls/CameraBoundaryManager';
import { LoopManager } from '../../three/core/LoopManager';
import { ResizeManager } from '../../three/core/ResizeManager';
import { OrbitControlManager } from '../../three/controls/OrbitControlManager';
import { LightsManager } from '../../three/lighting/LightsManager';

import { FloorManager } from '../../three/environment/FloorManager';

@Component({
  selector: 'main-scenario',
  standalone: true,
  templateUrl: './main-scenario.html',
  styleUrl: './main-scenario.css',
})
export class MainScenario implements AfterViewInit {

  @ViewChild('canvasContainer', { static: true }) container!: ElementRef;

  ngAfterViewInit(): void {
    const width = this.container.nativeElement.clientWidth;
    const height = this.container.nativeElement.clientHeight;

    // --- Core
    const sceneManager = new SceneManager();
    const cameraManager = new CameraManager(width, height);
    const rendererManager = new RendererManager(this.container.nativeElement, width, height);
    const loopManager = new LoopManager(
      rendererManager.renderer,
      sceneManager.scene,
      cameraManager.camera
    );

    // --- Create floor
    const floor = new FloorManager(sceneManager.scene, 50);

    // --- Camera limits
    const boundaries = new CameraBoundaryManager(cameraManager.camera, 50);
    loopManager.addUpdateCallback(() => boundaries.update());

    new ResizeManager(this.container.nativeElement, cameraManager.camera, rendererManager.renderer);
    new LightsManager(sceneManager.scene);

    // --- Controls
    const orbitControls = new OrbitControlManager(
      cameraManager.camera,
      rendererManager.renderer
    );
    loopManager.addUpdateCallback(() => orbitControls.update());

    // --- Demo cube
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 0x00ff88 })
    );
    cube.position.y = 1;
    sceneManager.add(cube);

    loopManager.addUpdateCallback(() => {
      cube.rotation.y += 0.01;
    });

    // --- Start
    loopManager.start();
  }
}
