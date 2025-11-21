import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-create-post',
  imports: [],
  templateUrl: './create-post.html',
  styleUrl: './create-post.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePost { }
