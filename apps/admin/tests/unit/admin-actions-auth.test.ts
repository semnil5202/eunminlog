import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdmin, from, dispatchClientBuild, getSignedUrl } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  dispatchClientBuild: vi.fn(),
  getSignedUrl: vi.fn(),
}));

vi.mock('@/shared/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/shared/lib/supabase-server', () => ({ supabaseServer: { from } }));
vi.mock('@/features/build-trigger/api/trigger-build', () => ({ dispatchClientBuild }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));

import * as posts from '@/features/post-management/api/actions';
import * as categories from '@/features/category-management/api/actions';
import { checkSlugDuplicate } from '@/features/post-editor/api/actions';
import { getPresignedUrl } from '@/features/media/api/actions';
import { triggerClientBuild } from '@/features/build-trigger/api/actions';

beforeEach(() => {
  requireAdmin.mockReset().mockRejectedValue(new Error('관리자 권한이 필요합니다.'));
  from.mockReset();
  dispatchClientBuild.mockReset();
  getSignedUrl.mockReset();
});

describe('관리자 Server Action 권한 경계', () => {
  it('모든 게시글·카테고리 Action에서 DB/빌드 호출보다 먼저 거부한다', async () => {
    const entries = [
      posts.fetchPosts, posts.updatePostRecommendations, posts.fetchPost,
      posts.createPost, posts.updatePost, posts.deletePosts,
      categories.fetchCategories, categories.fetchCategory, categories.fetchParentCategories,
      categories.fetchCategoryOptions, categories.createParentCategory,
      categories.createChildCategory, categories.updateCategory, categories.deleteCategories,
    ];
    for (const action of entries) {
      await expect((action as (...args: unknown[]) => Promise<unknown>)(undefined)).rejects.toThrow('관리자 권한');
    }
    expect(requireAdmin).toHaveBeenCalledTimes(entries.length);
    expect(from).not.toHaveBeenCalled();
    expect(dispatchClientBuild).not.toHaveBeenCalled();
  });

  it('슬러그 조회·업로드 URL·빌드 요청도 권한 검사 전에 부작용이 없다', async () => {
    await expect(checkSlugDuplicate('slug', 'posts')).rejects.toThrow('관리자 권한');
    await expect(getPresignedUrl('image/webp', 100)).rejects.toThrow('관리자 권한');
    await expect(triggerClientBuild()).rejects.toThrow('관리자 권한');
    expect(from).not.toHaveBeenCalled();
    expect(getSignedUrl).not.toHaveBeenCalled();
    expect(dispatchClientBuild).not.toHaveBeenCalled();
  });
});
