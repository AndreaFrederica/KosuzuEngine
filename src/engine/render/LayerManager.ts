export interface LayerItem {
  id: string;
  z: number;
}

export class LayerManager {
  items: LayerItem[];
  constructor() {
    this.items = [];
  }
}

