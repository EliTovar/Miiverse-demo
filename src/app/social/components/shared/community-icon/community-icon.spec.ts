import { TestBed } from '@angular/core/testing';
import { CommunityIcon } from './community-icon';

describe('CommunityIcon', () => {
  function render(name: string) {
    const fixture = TestBed.createComponent(CommunityIcon);
    fixture.componentRef.setInput('name', name);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('usa las iniciales de las dos primeras palabras', () => {
    expect(render('Splatoon 3').initials()).toBe('S3');
    expect(render('The Legend of Zelda: Breath of the Wild').initials()).toBe('TL');
    expect(render('!!!').initials()).toBe('?');
  });

  it('da el mismo color a las variantes de un mismo nombre (como el backend)', () => {
    const color = render('Splatoon 3').color();
    expect(render('splatoon-3').color()).toBe(color);
    expect(render('  SPLATOON   3 ').color()).toBe(color);
    expect(render('Pokémon').color()).toBe(render('pokemon').color());
  });
});
