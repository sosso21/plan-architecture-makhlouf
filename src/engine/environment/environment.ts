/**
 * Ciel physique (Preetham) en arrière-plan, soleil avec ombres douces et
 * lumière d'appoint. Les reflets proviennent d'un environnement « studio »
 * neutre : le ciel Preetham, très HDR, noierait le soleil et les ombres.
 */
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { daylight, SEASON_DAY, sunDirection, sunPosition, type Season } from './solar';

export interface SunState {
  readonly season: Season;
  readonly hour: number;
}

const NIGHT_SKY = new THREE.Color('#0b1220');
const DUSK = new THREE.Color('#ffb070');
const NOON = new THREE.Color('#fff4e3');

export class Environment {
  readonly sun = new THREE.DirectionalLight(0xffffff, 3);
  readonly hemi = new THREE.HemisphereLight(0xdfe9f5, 0x6b5d48, 0.6);
  readonly sky = new Sky();
  private readonly envTarget: THREE.WebGLRenderTarget;
  private night = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    shadowSize: number,
    private readonly focus: THREE.Vector3,
  ) {
    this.sky.scale.setScalar(4500);
    const u = this.sky.material.uniforms;
    u.turbidity!.value = 4.5;
    u.rayleigh!.value = 1.4;
    u.mieCoefficient!.value = 0.004;
    u.mieDirectionalG!.value = 0.82;
    scene.add(this.sky);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(room, 0.04);
    room.dispose();
    pmrem.dispose();
    scene.environment = this.envTarget.texture;

    this.sun.castShadow = shadowSize > 0;
    this.sun.shadow.mapSize.set(Math.max(shadowSize, 512), Math.max(shadowSize, 512));
    const cam = this.sun.shadow.camera;
    cam.left = -30;
    cam.right = 30;
    cam.top = 30;
    cam.bottom = -30;
    cam.near = 1;
    cam.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 3;
    this.sun.target.position.copy(focus);
    scene.add(this.sun, this.sun.target, this.hemi);
  }

  /** Facteur de nuit courant (0 → 1), utile pour l'éclairage intérieur. */
  get nightFactor(): number {
    return this.night;
  }

  update(state: SunState): void {
    const pos = sunPosition(SEASON_DAY[state.season], state.hour);
    const [dx, dy, dz] = sunDirection(pos);
    const dir = new THREE.Vector3(dx, dy, dz);
    const day = daylight(pos.altitude);
    this.night = 1 - day;

    this.sky.material.uniforms.sunPosition!.value.copy(dir);
    // Soleil sous l'horizon : on éclaire avec une « lune » froide au zénith.
    const lightDir = pos.altitude > 2 ? dir : new THREE.Vector3(0.3, 1, 0.4).normalize();
    this.sun.position.copy(this.focus).addScaledVector(lightDir, 80);
    this.sun.target.position.copy(this.focus);
    this.sun.target.updateMatrixWorld();

    const warmth = Math.max(0, Math.min(1, (pos.altitude - 2) / 30));
    this.sun.color.copy(DUSK).lerp(NOON, warmth);
    this.sun.intensity = pos.altitude > 2 ? 3.2 * day : 0.25;
    if (pos.altitude <= 2) this.sun.color.set('#9fb4e0');
    this.hemi.intensity = 0.15 + 0.55 * day;
    this.hemi.color.set(day > 0.3 ? '#dfe9f5' : '#5b6d99');

    this.scene.background = day < 0.05 ? NIGHT_SKY : null;
    this.sky.visible = day >= 0.05;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(NIGHT_SKY).lerp(new THREE.Color('#cfd9e2'), day);
    }
    this.scene.environmentIntensity = 0.12 + 0.38 * day;
  }

  dispose(): void {
    this.envTarget.dispose();
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.sun.dispose();
    this.hemi.dispose();
  }
}
