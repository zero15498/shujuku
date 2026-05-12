/**
 * useHelloService.test — 验证 D17 中间层模式与阶段 0 临时展示块下线状态
 *
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT_ID = 'acu-app-v2';
const HELLO_BLOCK_SELECTOR = '[data-acu-hello-service]';

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useHelloService', () => {
  it('refresh 重新读 service 函数当前值', async () => {
    let probe = 'k0';
    const settings = { dataIsolationEnabled: true, dataIsolationCode: 'k0' };
    vi.resetModules();
    vi.doMock('../../../src/service/runtime/state-manager', () => ({
      getCurrentIsolationKey_ACU: () => probe,
      settings_ACU: settings,
      currentChatFileIdentifier_ACU: 'chat-A',
      coreApisAreReady_ACU: true,
    }));
    const { useHelloService } = await import(
      '../../../src/presentation-v2/composables/useHelloService'
    );
    const { isolationKey, isolationEnabled, isolationCode, chatFileIdentifier, coreApisReady, refresh } =
      useHelloService();
    expect(isolationKey.value).toBe('k0');
    expect(isolationEnabled.value).toBe(true);
    expect(isolationCode.value).toBe('k0');
    expect(chatFileIdentifier.value).toBe('chat-A');
    expect(coreApisReady.value).toBe(true);
    probe = 'k1';
    settings.dataIsolationCode = 'k1';
    refresh();
    expect(isolationKey.value).toBe('k1');
    expect(isolationCode.value).toBe('k1');
    vi.doUnmock('../../../src/service/runtime/state-manager');
  });

  it('service 抛异常时退化为空串而不是冒泡', async () => {
    vi.resetModules();
    vi.doMock('../../../src/service/runtime/state-manager', () => ({
      getCurrentIsolationKey_ACU: () => {
        throw new Error('settings_ACU not ready');
      },
      settings_ACU: {},
      currentChatFileIdentifier_ACU: '',
      coreApisAreReady_ACU: false,
    }));
    const { useHelloService } = await import(
      '../../../src/presentation-v2/composables/useHelloService'
    );
    const { isolationKey, isolationEnabled, chatFileIdentifier, coreApisReady } = useHelloService();
    expect(isolationKey.value).toBe('');
    expect(isolationEnabled.value).toBe(false);
    expect(chatFileIdentifier.value).toBe('');
    expect(coreApisReady.value).toBe(false);
    vi.doUnmock('../../../src/service/runtime/state-manager');
  });

  it('隔离未启用时空 key 被标记为正常配置状态', async () => {
    vi.resetModules();
    vi.doMock('../../../src/service/runtime/state-manager', () => ({
      getCurrentIsolationKey_ACU: () => '',
      settings_ACU: { dataIsolationEnabled: false, dataIsolationCode: '' },
      currentChatFileIdentifier_ACU: 'chat-default',
      coreApisAreReady_ACU: true,
    }));
    const { useHelloService } = await import(
      '../../../src/presentation-v2/composables/useHelloService'
    );
    const { isolationKey, isolationEnabled, chatFileIdentifier, coreApisReady } = useHelloService();
    expect(isolationKey.value).toBe('');
    expect(isolationEnabled.value).toBe(false);
    expect(chatFileIdentifier.value).toBe('chat-default');
    expect(coreApisReady.value).toBe(true);
    vi.doUnmock('../../../src/service/runtime/state-manager');
  });
});

describe('Dashboard 页集成 hello-service', () => {
  it('挂载新 UI 后仪表盘不再渲染阶段 0 hello-service 临时块', async () => {
    vi.resetModules();
    vi.doMock('../../../src/service/runtime/state-manager', () => ({
      getCurrentIsolationKey_ACU: () => 'tag-XYZ',
      settings_ACU: { dataIsolationEnabled: true, dataIsolationCode: 'tag-XYZ' },
      currentChatFileIdentifier_ACU: 'chat-XYZ',
      currentJsonTableData_ACU: {},
      coreApisAreReady_ACU: true,
    }));
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');
    await mount.openAcuV2App();

    const root = document.getElementById(ROOT_ID);
    expect(root).not.toBeNull();
    expect(document.querySelector(HELLO_BLOCK_SELECTOR)).toBeNull();
    const text = root!.textContent || '';
    expect(text).toContain('chat-XYZ');
    expect(text).toContain('数据库状态');
    expect(text).toContain('已加载');

    mount.__resetAcuV2MountForTests();
    vi.doUnmock('../../../src/service/runtime/state-manager');
  });

  it('isolation key 为空串时不再显示旧 hello-service 兜底文案', async () => {
    vi.resetModules();
    vi.doMock('../../../src/service/runtime/state-manager', () => ({
      getCurrentIsolationKey_ACU: () => '',
      settings_ACU: { dataIsolationEnabled: false, dataIsolationCode: '' },
      currentChatFileIdentifier_ACU: 'chat-default',
      currentJsonTableData_ACU: {},
      coreApisAreReady_ACU: true,
    }));
    const mount = await import('../../../src/presentation-v2/bootstrap/mount');
    await mount.openAcuV2App();

    const root = document.getElementById(ROOT_ID);
    expect(root).not.toBeNull();
    const text = root!.textContent || '';
    expect(document.querySelector(HELLO_BLOCK_SELECTOR)).toBeNull();
    expect(text).not.toContain('未启用数据隔离，业务层按设计返回空 key');
    expect(text).toContain('chat-default');

    mount.__resetAcuV2MountForTests();
    vi.doUnmock('../../../src/service/runtime/state-manager');
  });
});
