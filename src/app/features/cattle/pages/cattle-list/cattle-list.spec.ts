import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CattleList } from './cattle-list';

describe('CattleList', () => {
  let component: CattleList;
  let fixture: ComponentFixture<CattleList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CattleList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CattleList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
