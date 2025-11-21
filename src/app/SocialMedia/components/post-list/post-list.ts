import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'post-list',
  imports: [],
  templateUrl: './post-list.html',
  styleUrl: './post-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostList { }
