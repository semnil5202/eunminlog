import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CategoryOption = { value: string; label: string };

type CategorySelectorProps = {
  category: string;
  subCategory: string;
  onCategoryChange: (value: string) => void;
  onSubCategoryChange: (value: string) => void;
  categoryOptions: CategoryOption[];
  subCategoryMap: Record<string, CategoryOption[]>;
};

export function CategorySelector({
  category,
  subCategory,
  onCategoryChange,
  onSubCategoryChange,
  categoryOptions,
  subCategoryMap,
}: CategorySelectorProps) {
  const subCategoryOptions = category ? (subCategoryMap[category] ?? []) : [];

  return (
    <div className="flex gap-3">
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="대분류" />
        </SelectTrigger>
        <SelectContent>
          {categoryOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={subCategory}
        onValueChange={onSubCategoryChange}
        disabled={!category}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="소분류" />
        </SelectTrigger>
        <SelectContent>
          {subCategoryOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
