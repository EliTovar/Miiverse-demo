import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SocialMediaServicie } from '../services/social-media.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(SocialMediaServicie);
  const token = auth.getToken();

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
