/**
 * AcuRadioGroup / AcuCheckbox — 自绘选择控件
 *
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { nextTick, type App, createApp, defineComponent, h, ref } from 'vue';
import AcuCheckbox from '../../../src/presentation-v2/components/_lib/AcuCheckbox.vue';
import AcuRadioGroup from '../../../src/presentation-v2/components/_lib/AcuRadioGroup.vue';

const apps: Array<{ app: App<Element>; el: HTMLElement }> = [];

function mountRadio(initial = 'native'): HTMLElement {
  const wrapper = defineComponent({
    setup() {
      const value = ref(initial);
      return () => h(AcuRadioGroup, {
        name: 'storage-mode',
        options: [
          { value: 'native', label: '原生 JSON' },
          { value: 'sqlite', label: 'SQLite' },
        ],
        modelValue: value.value,
        direction: 'vertical',
        'onUpdate:modelValue': (next: string) => {
          value.value = next;
        },
      });
    },
  });
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp(wrapper);
  app.mount(el);
  apps.push({ app, el });
  return el;
}

function mountCheckbox(initial = false): HTMLElement {
  const wrapper = defineComponent({
    setup() {
      const checked = ref(initial);
      return () => h(AcuCheckbox, {
        modelValue: checked.value,
        label: '选择条目',
        'onUpdate:modelValue': (next: boolean) => {
          checked.value = next;
        },
      });
    },
  });
  const el = document.createElement('div');
  document.body.appendChild(el);
  const app = createApp(wrapper);
  app.mount(el);
  apps.push({ app, el });
  return el;
}

afterEach(() => {
  while (apps.length > 0) {
    const entry = apps.pop()!;
    entry.app.unmount();
    entry.el.remove();
  }
  document.body.innerHTML = '';
});

describe('AcuRadioGroup', () => {
  it('使用 button radio 语义，不渲染隐藏原生 radio', () => {
    const el = mountRadio();
    expect(el.querySelector('input[type="radio"]')).toBeNull();
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));
    expect(buttons).toHaveLength(2);
    expect(buttons.map(btn => btn.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('点击和方向键都会切换当前项', async () => {
    const el = mountRadio();
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button[role="radio"]'));

    buttons[1].click();
    await nextTick();
    expect(buttons.map(btn => btn.getAttribute('aria-checked'))).toEqual(['false', 'true']);

    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await nextTick();
    await nextTick();
    expect(buttons.map(btn => btn.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('支持每个选项的常驻 description（D22 形态）', () => {
    const wrapper = defineComponent({
      setup() {
        const value = ref('native');
        return () => h(AcuRadioGroup, {
          name: 'storage-mode-with-desc',
          options: [
            { value: 'native', label: '原生 JSON', description: '直接写入聊天楼层。' },
            { value: 'sqlite', label: 'SQLite', description: '本地内存数据库执行填表。' },
          ],
          modelValue: value.value,
          direction: 'vertical',
          'onUpdate:modelValue': (next: string) => { value.value = next; },
        });
      },
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    const app = createApp(wrapper);
    app.mount(el);
    apps.push({ app, el });

    const descs = Array.from(el.querySelectorAll('.acu-radio-group__desc'));
    expect(descs).toHaveLength(2);
    expect(descs.map(d => d.textContent)).toEqual([
      '直接写入聊天楼层。',
      '本地内存数据库执行填表。',
    ]);
  });
});

describe('AcuCheckbox', () => {
  it('使用 button checkbox 语义，不渲染隐藏原生 checkbox', () => {
    const el = mountCheckbox(false);
    expect(el.querySelector('input[type="checkbox"]')).toBeNull();
    const button = el.querySelector<HTMLButtonElement>('button[role="checkbox"]');
    expect(button).not.toBeNull();
    expect(button!.getAttribute('aria-checked')).toBe('false');
  });

  it('点击后切换 aria-checked', async () => {
    const el = mountCheckbox(false);
    const button = el.querySelector<HTMLButtonElement>('button[role="checkbox"]')!;

    button.click();
    await nextTick();
    expect(button.getAttribute('aria-checked')).toBe('true');

    button.click();
    await nextTick();
    expect(button.getAttribute('aria-checked')).toBe('false');
  });
});
