<template>
  <q-dialog v-model="isOpen">
    <q-card style="min-width: 800px; height: 80vh" class="column">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Load Model</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
      >
        <q-tab name="presets" label="Presets" />
        <q-tab name="network" label="Community Models" />
        <q-tab name="url" label="URL" />
        <q-tab name="local" label="Local Files" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated class="col">
        <!-- Presets Tab -->
        <q-tab-panel name="presets">
          <q-list bordered separator>
            <q-item
              clickable
              v-ripple
              v-for="model in presets"
              :key="model.url"
              @click="loadPreset(model)"
            >
              <q-item-section>
                <q-item-label>{{ model.name }}</q-item-label>
                <q-item-label caption>{{ model.desc }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="chevron_right" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>

        <!-- Network Tab (Community) -->
        <q-tab-panel name="network" class="column q-pa-none">
          <div class="row col full-height">
            <!-- Tree View -->
            <div class="col-6 q-pa-sm scroll border-right">
              <div v-if="loadingNetwork" class="row justify-center q-pa-md">
                <q-spinner color="primary" size="3em" />
                <div class="q-ml-sm">Loading model list...</div>
              </div>
              <div v-else-if="networkError" class="text-negative q-pa-md">
                {{ networkError }}
                <br />
                <q-btn label="Retry" flat color="primary" @click="fetchModelList" />
              </div>
              <q-tree
                v-else
                :nodes="treeNodes"
                node-key="id"
                label-key="name"
                v-model:selected="selectedNode"
                default-expand-all
                no-connectors
                v-model:expanded="expandedNodes"
              >
                <template v-slot:default-header="prop">
                  <div class="row items-center">
                    <q-icon
                      :name="prop.node.children ? 'folder' : 'article'"
                      class="q-mr-sm"
                      color="primary"
                    />
                    <div>{{ prop.node.name }}</div>
                    <q-badge v-if="prop.node.modelCount" color="grey" class="q-ml-sm">{{
                      prop.node.modelCount
                    }}</q-badge>
                  </div>
                </template>
              </q-tree>
            </div>

            <!-- File List -->
            <div class="col-6 q-pa-sm scroll bg-grey-1">
              <div v-if="!selectedNode" class="text-grey q-pa-md text-center">
                Select a folder to view files
              </div>
              <q-list v-else separator dense>
                <q-item-label header>{{ selectedNodeData?.name }}</q-item-label>

                <template v-if="modelFiles.length > 0">
                  <q-item-label header class="text-primary text-weight-bold"
                    >Model Settings</q-item-label
                  >
                  <q-item
                    clickable
                    v-ripple
                    v-for="file in modelFiles"
                    :key="file"
                    @click="loadNetworkFile(selectedNodeData!, file)"
                    class="bg-blue-1"
                  >
                    <q-item-section avatar>
                      <q-icon name="smart_toy" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold text-primary">{{ file }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn flat round dense icon="play_circle" size="md" color="primary" />
                    </q-item-section>
                  </q-item>
                  <q-separator />
                </template>

                <q-expansion-item
                  v-if="otherFiles.length > 0"
                  label="Other Files (Textures, Motions, etc.)"
                  caption="Usually not loaded directly"
                  dense
                  header-class="text-grey-7"
                >
                  <q-item
                    clickable
                    v-ripple
                    v-for="file in otherFiles"
                    :key="file"
                    @click="loadNetworkFile(selectedNodeData!, file)"
                    dense
                    class="q-pl-md"
                  >
                    <q-item-section avatar style="min-width: 32px">
                      <q-icon name="description" size="xs" color="grey" />
                    </q-item-section>
                    <q-item-section class="text-grey-8">{{ file }}</q-item-section>
                  </q-item>
                </q-expansion-item>

                <div
                  v-if="!selectedNodeData?.files || selectedNodeData?.files.length === 0"
                  class="text-grey q-pa-md text-center"
                >
                  No files in this folder.
                </div>
              </q-list>
            </div>
          </div>
        </q-tab-panel>

        <!-- URL Tab -->
        <q-tab-panel name="url">
          <q-input
            filled
            v-model="url"
            label="Model URL (.model3.json / .model.json)"
            hint="Enter a direct link to the model setting file"
            @keyup.enter="loadUrl"
          />
          <div class="row justify-end q-mt-md">
            <q-btn color="primary" label="Load" @click="loadUrl" :disable="!url" />
          </div>
        </q-tab-panel>

        <!-- Local Tab -->
        <q-tab-panel name="local">
          <div class="text-body2 q-mb-md">
            Select a folder containing the model files (moc3, textures, physics, etc.).
            <br />
            Note: Drag and drop is also supported on the main canvas.
          </div>

          <div class="row justify-center">
            <!-- Quasar q-file doesn't support webkitdirectory well, using native input -->
            <input
              type="file"
              webkitdirectory
              directory
              multiple
              ref="fileInput"
              style="display: none"
              @change="onFileChange"
            />
            <q-btn color="primary" icon="folder_open" label="Select Folder" @click="pickFiles" />
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'load', source: string | File[]): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const tab = ref('network');
const url = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

const presets = [
  {
    name: 'Shizuku (Cubism 2)',
    desc: 'Classic example model',
    url: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json',
  },
  {
    name: 'Haru (Cubism 4)',
    desc: 'Cubism 4 example',
    url: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru/haru_greeter_t03.model3.json',
  },
  {
    name: 'Hiyori (Cubism 4)',
    desc: 'Cubism 4 Pro example',
    url: 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/hiyori/hiyori_pro_t10.model3.json',
  },
];

// --- Network / Community Logic ---
interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
  files?: string[];
  path?: string; // Full path for URL construction
  modelCount?: number;
}

const treeNodes = ref<TreeNode[]>([]);
const loadingNetwork = ref(false);
const networkError = ref('');
const selectedNode = ref<string | null>(null);
const expandedNodes = ref<string[]>([]);

const selectedNodeData = computed(() => {
  if (!selectedNode.value) return null;
  return findNode(treeNodes.value, selectedNode.value);
});

const modelFiles = computed(() => {
  if (!selectedNodeData.value?.files) return [];
  return selectedNodeData.value.files.filter(
    (f) => f.endsWith('.model.json') || f.endsWith('.model3.json'),
  );
});

const otherFiles = computed(() => {
  if (!selectedNodeData.value?.files) return [];
  return selectedNodeData.value.files.filter(
    (f) => !f.endsWith('.model.json') && !f.endsWith('.model3.json'),
  );
});

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

const REPOS = ['andatoshiki/toshiki-live2d', 'guansss/pixi-live2d-display'];

async function fetchModelList() {
  if (treeNodes.value.length > 0) return; // Already loaded

  loadingNetwork.value = true;
  networkError.value = '';

  try {
    const roots: TreeNode[] = [];

    for (const repo of REPOS) {
      const cleanName = repo.toLowerCase().replace(/\//g, '');
      // We try to fetch from toshiki.dev which hosts these JSONs
      // Fallback to jsdelivr if possible (but jsdelivr doesn't list files usually, we need the json map)
      const jsonUrl = `https://toshiki.dev/live2d-viewer/${cleanName}.json`;

      try {
        const res = await fetch(jsonUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        // Transform data to TreeNode
        const root: TreeNode = {
          id: repo,
          name: repo,
          children: [],
          path: repo, // Base path
          modelCount: 0,
        };

        // The JSON structure from toshiki-live2d-viewer:
        // { models: { name: "...", children: [...], files: [...] }, settings: ... }
        if (data.models) {
          root.children = transformChildren(data.models.children, repo);
          root.files = data.models.files;
          root.modelCount = countModels(root);
        }

        roots.push(root);
      } catch (e) {
        console.warn(`Failed to fetch ${repo}:`, e);
        // Add a dummy node for error
        roots.push({ id: repo, name: `${repo} (Failed to load)`, children: [] });
      }
    }

    treeNodes.value = roots;
    if (roots.length > 0 && roots[0]) expandedNodes.value.push(roots[0].id);
  } catch (e) {
    networkError.value = 'Failed to load model list. Please check your connection.';
    console.error(e);
  } finally {
    loadingNetwork.value = false;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformChildren(nodes: any[], parentPath: string): TreeNode[] {
  if (!nodes) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return nodes.map((node: any) => {
    const currentPath = `${parentPath}/${node.name}`;
    return {
      id: currentPath, // Use path as ID
      name: node.name,
      children: transformChildren(node.children, currentPath),
      files: node.files,
      path: currentPath,
      modelCount: 0, // Will be calculated later
    };
  });
}

function countModels(node: TreeNode): number {
  let count = node.files ? node.files.length : 0;
  if (node.children) {
    for (const child of node.children) {
      count += countModels(child);
    }
  }
  node.modelCount = count;
  return count;
}

const JSDELIVR_PREFIX = 'https://jsd.toshiki.dev/gh/';

function loadNetworkFile(node: TreeNode, file: string) {
  // Construct URL
  // node.path should be full repo path e.g. "andatoshiki/toshiki-live2d/Live2D/Senko_Normals"
  // But wait, the JSON structure from toshiki might have "name" as just the folder name.
  // My transformChildren builds the path recursively.

  // However, the JSON from toshiki-live2d-viewer's "models" object usually starts with "models" having name=repo.
  // So my recursive path building should be correct.

  const url = `${JSDELIVR_PREFIX}${node.path}/${file}`;
  emit('load', url);
  isOpen.value = false;
}

// Watch tab to load network
watch(tab, (val) => {
  if (val === 'network') {
    void fetchModelList();
  }
});

// --- Existing Logic ---

function loadUrl() {
  if (url.value) {
    emit('load', url.value);
    isOpen.value = false;
  }
}

function loadPreset(model: { url: string }) {
  emit('load', model.url);
  isOpen.value = false;
}

function pickFiles() {
  if (fileInput.value) {
    fileInput.value.click();
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    // Convert FileList to Array
    const files = Array.from(input.files);
    emit('load', files);
    isOpen.value = false;
  }
}
</script>

<style scoped>
.border-right {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
