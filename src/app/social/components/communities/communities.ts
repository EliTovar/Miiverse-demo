import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MiiverseApiService } from '../../services/miiverse-api.service';
import { MiiverseCommunity } from '../../models/miiverse.models';
import { CommunityIcon } from '../shared/community-icon/community-icon';

/** Lista de comunidades con buscador (como "Search > Communities" en Archiverse). */
@Component({
  selector: 'app-communities',
  standalone: true,
  imports: [FormsModule, RouterLink, CommunityIcon],
  templateUrl: './communities.html',
  styleUrl: '../shared/result-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Communities implements OnInit {
  private api = inject(MiiverseApiService);

  search = '';
  communities = signal<MiiverseCommunity[]>([]);
  loading = signal(true);
  error = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.api.getCommunities(this.search).subscribe({
      next: list => {
        this.communities.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
