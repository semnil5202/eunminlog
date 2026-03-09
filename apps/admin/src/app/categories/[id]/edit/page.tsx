'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SlugField } from '@/shared/components/slug/SlugField';

import {
  fetchCategory,
  fetchParentCategories,
  updateCategory,
} from '@/features/category-management/api/actions';

type CategoryData = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  is_multilingual: boolean;
};

type ParentOption = {
  id: string;
  slug: string;
  name: string;
};

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CategoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchCategory(id)
      .then((cat) => setData(cat))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        카테고리를 불러오는 중...
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/categories"
          className="inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="text-muted-foreground">카테고리를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return data.parent_id === null ? (
    <ParentCategoryEdit data={data} />
  ) : (
    <ChildCategoryEdit data={data} />
  );
}

function ParentCategoryEdit({ data }: { data: CategoryData }) {
  const router = useRouter();
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug);
  const [dialogType, setDialogType] = useState<'slug' | 'name' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !slug.trim()) return;

    const slugChanged = slug !== data.slug;
    const nameChanged = name !== data.name;

    if (slugChanged) {
      setDialogType('slug');
    } else if (nameChanged) {
      setDialogType('name');
    } else {
      toast.info('변경된 내용이 없습니다.');
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await updateCategory({ id: data.id, name, slug });
      setDialogType(null);
      toast.success('카테고리가 수정되었습니다.');
      router.push('/categories');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/categories"
          className="mb-3 inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">카테고리 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">대분류 카테고리를 수정합니다.</p>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <h2 className="text-base font-bold">대분류 카테고리 수정</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              카테고리명 <span className="text-primary-600">*</span>
            </label>
            <Input placeholder="예: 맛집" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            슬러그 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={name}
            value={slug}
            onChange={setSlug}
            placeholder="예: delicious"
            table="categories"
            excludeId={data.id}
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={!name.trim() || !slug.trim()} onClick={handleSubmit}>
            수정
          </Button>
        </div>
      </div>

      <AlertDialog open={dialogType === 'slug'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>slug 변경 경고</AlertDialogTitle>
            <AlertDialogDescription>
              slug 수정 시 기존 경로로 접근할 경우 리다이렉트가 발생하여 크롤러에 영향이 갑니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} onSelect={(e) => e.preventDefault()} disabled={isSaving}>
              {isSaving ? '수정 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialogType === 'name'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리명 변경</AlertDialogTitle>
            <AlertDialogDescription>
              대분류 카테고리를 {data.name}에서 → {name}으로 수정하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} onSelect={(e) => e.preventDefault()} disabled={isSaving}>
              {isSaving ? '수정 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChildCategoryEdit({ data }: { data: CategoryData }) {
  const router = useRouter();
  const [parentId, setParentId] = useState(data.parent_id!);
  const [name, setName] = useState(data.name);
  const [slug, setSlug] = useState(data.slug);
  const [dialogType, setDialogType] = useState<'slug' | 'name' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);

  useEffect(() => {
    fetchParentCategories()
      .then(setParentOptions)
      .catch(() => toast.error('대분류 목록을 불러오지 못했습니다.'));
  }, []);

  const handleSubmit = () => {
    if (!parentId || !name.trim() || !slug.trim()) return;

    const slugChanged = slug !== data.slug;
    const nameChanged = name !== data.name || parentId !== data.parent_id;

    if (slugChanged) {
      setDialogType('slug');
    } else if (nameChanged) {
      setDialogType('name');
    } else {
      toast.info('변경된 내용이 없습니다.');
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await updateCategory({ id: data.id, name, slug, parentId });
      setDialogType(null);
      toast.success('카테고리가 수정되었습니다.');
      router.push('/categories');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 수정에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/categories"
          className="mb-3 inline-flex text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">카테고리 수정</h1>
        <p className="mt-1 text-sm text-muted-foreground">소분류 카테고리를 수정합니다.</p>
      </div>

      <div className="space-y-6 rounded-lg border bg-card p-6">
        <h2 className="text-base font-bold">소분류 카테고리 수정</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              대분류 <span className="text-primary-600">*</span>
            </label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                {parentOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              카테고리명 <span className="text-primary-600">*</span>
            </label>
            <Input placeholder="예: 한식" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            슬러그 <span className="text-primary-600">*</span>
          </label>
          <SlugField
            sourceText={name}
            value={slug}
            onChange={setSlug}
            placeholder="예: korean"
            table="categories"
            excludeId={data.id}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="multilingual-check"
              className="size-4 cursor-not-allowed accent-primary-600"
              checked={data.is_multilingual}
              disabled
            />
            <label
              htmlFor="multilingual-check"
              className="cursor-not-allowed text-sm font-medium text-muted-foreground"
            >
              다국어 지원
            </label>
          </div>
          <Button disabled={!parentId || !name.trim() || !slug.trim()} onClick={handleSubmit}>
            수정
          </Button>
        </div>
      </div>

      <AlertDialog open={dialogType === 'slug'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>slug 변경 경고</AlertDialogTitle>
            <AlertDialogDescription>
              slug 수정 시 기존 경로로 접근할 경우 리다이렉트가 발생하여 크롤러에 영향이 갑니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} onSelect={(e) => e.preventDefault()} disabled={isSaving}>
              {isSaving ? '수정 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialogType === 'name'} onOpenChange={() => setDialogType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리명 변경</AlertDialogTitle>
            <AlertDialogDescription>
              소분류 카테고리를 {data.name}에서 → {name}으로 수정하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} onSelect={(e) => e.preventDefault()} disabled={isSaving}>
              {isSaving ? '수정 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
