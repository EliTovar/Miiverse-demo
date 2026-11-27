import { Pipe, PipeTransform } from '@angular/core';

/** Foto de perfil de quien todavía no tiene una foto de su Mii: la cara del maniquí. */
export const MANNEQUIN_AVATAR = 'models/mii-parts/thumbs/mannequin/face.webp';

/**
 * Uso en una plantilla: `[src]="post.mii_avatar_url | miiAvatar"`.
 * Hoy el backend solo envía iniciales genéricas (ui-avatars.com), así que todos
 * ven el maniquí. Cuando el backend guarde la foto real del Mii, esa se mostrará tal cual.
 */
@Pipe({ name: 'miiAvatar', standalone: true })
export class MiiAvatarPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return !url || url.includes('ui-avatars.com') ? MANNEQUIN_AVATAR : url;
  }
}
