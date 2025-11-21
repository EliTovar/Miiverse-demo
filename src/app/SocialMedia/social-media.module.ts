import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SOCIAL_MEDIA_ROUTES } from './social-media.routes';
import { SocialMedia } from './SocialMedia';

@NgModule({
  imports: [SocialMedia, RouterModule.forChild(SOCIAL_MEDIA_ROUTES)]
})
export class SocialMediaModule {}
