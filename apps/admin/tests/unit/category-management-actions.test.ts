import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChildCategory, updateCategory } from '@/features/category-management/api/actions';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  triggerClientBuild: vi.fn(),
}));

vi.mock('@/shared/lib/supabase-server', () => ({ supabaseServer: { from: mocks.from } }));
vi.mock('@/features/build-trigger/api/actions', () => ({
  triggerClientBuild: mocks.triggerClientBuild,
}));

type Category = {
  id: string;
  slug: string;
  parent_id: string | null;
  is_multilingual: boolean;
};

const root = (id: string, isMultilingual: boolean): Category => ({
  id,
  slug: id,
  parent_id: null,
  is_multilingual: isMultilingual,
});
const child = (id: string, parentId: string, isMultilingual: boolean): Category => ({
  id,
  slug: id,
  parent_id: parentId,
  is_multilingual: isMultilingual,
});

function mockDatabase(categories: Category[], postCount = 0, postError: Error | null = null) {
  const writes: unknown[] = [];
  mocks.from.mockImplementation((table: string) => ({
    select: (_columns: string, options?: { count?: string; head?: boolean }) => {
      if (table === 'posts') {
        return {
          eq: async () => ({ count: postCount, error: postError }),
        };
      }
      return {
        eq: (column: string, value: string) => ({
          single: async () => ({
            data:
              categories.find((category) => category[column as keyof Category] === value) ?? null,
            error: null,
          }),
        }),
        order: () => ({ limit: () => ({ single: async () => ({ data: null }) }) }),
        ...(options ? { count: postCount } : {}),
      };
    },
    update: (data: unknown) => {
      writes.push(data);
      return { eq: async () => ({ error: null }) };
    },
    insert: (data: unknown) => {
      writes.push(data);
      return { select: () => ({ single: async () => ({ data: { id: 'new' }, error: null }) }) };
    },
  }));
  return writes;
}

beforeEach(() => {
  mocks.from.mockReset();
  mocks.triggerClientBuild.mockReset().mockResolvedValue(undefined);
});

describe('카테고리 계층 및 다국어 정합성', () => {
  it('다국어 미지원 대분류에 다국어 지원 소분류 생성을 거부한다', async () => {
    const writes = mockDatabase([root('parent', false)]);
    await expect(
      createChildCategory({
        parentSlug: 'parent',
        name: '하위',
        slug: 'new',
        isMultilingual: true,
      }),
    ).rejects.toThrow('다국어 미지원 대분류');
    expect(writes).toHaveLength(0);
  });

  it('소분류를 부모로 선택한 생성 요청을 거부한다', async () => {
    const writes = mockDatabase([child('nested', 'parent', true)]);
    await expect(
      createChildCategory({
        parentSlug: 'nested',
        name: '하위',
        slug: 'new',
        isMultilingual: false,
      }),
    ).rejects.toThrow('소분류를 대분류로');
    expect(writes).toHaveLength(0);
  });

  it('다국어 지원 소분류를 미지원 대분류로 이동하지 못한다', async () => {
    const writes = mockDatabase([child('current', 'old', true), root('target', false)]);
    await expect(
      updateCategory({ id: 'current', name: '하위', slug: 'current', parentId: 'target' }),
    ).rejects.toThrow('다국어 지원 소분류');
    expect(writes).toHaveLength(0);
  });

  it('대분류를 소분류로 바꾸거나 소분류를 부모로 선택하지 못한다', async () => {
    const writes = mockDatabase([root('current', true), child('nested', 'current', true)]);
    await expect(
      updateCategory({ id: 'current', name: '대분류', slug: 'current', parentId: 'nested' }),
    ).rejects.toThrow('대분류의 상위');
    await expect(
      updateCategory({ id: 'nested', name: '소분류', slug: 'nested', parentId: 'nested' }),
    ).rejects.toThrow('유효한 대분류');
    expect(writes).toHaveLength(0);
  });

  it('게시글이 있는 소분류의 대분류 변경을 거부한다', async () => {
    const writes = mockDatabase([child('current', 'old', false), root('target', true)], 1);
    await expect(
      updateCategory({ id: 'current', name: '하위', slug: 'current', parentId: 'target' }),
    ).rejects.toThrow('게시글이 포함된 소분류');
    expect(writes).toHaveLength(0);
  });

  it('게시글 수 조회 실패 시 이동을 거부한다', async () => {
    const writes = mockDatabase(
      [child('current', 'old', false), root('target', true)],
      0,
      new Error('query failed'),
    );
    await expect(
      updateCategory({ id: 'current', name: '하위', slug: 'current', parentId: 'target' }),
    ).rejects.toThrow('게시글 수를 확인할 수 없습니다');
    expect(writes).toHaveLength(0);
  });

  it('글이 없는 미지원 소분류는 지원 대분류로 이동할 수 있다', async () => {
    const writes = mockDatabase([child('current', 'old', false), root('target', true)]);
    await updateCategory({ id: 'current', name: '하위', slug: 'current', parentId: 'target' });
    expect(writes).toEqual([expect.objectContaining({ parent_id: 'target' })]);
  });
});
