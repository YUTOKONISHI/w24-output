import { Category, NewProduct, Product } from '@/types/admin';
import { Dispatch, SetStateAction } from 'react';

type Props = {
  products: Product[];
  categories: Category[];
  editingId: number | null;
  editingProduct: Product | null;
  showNewRow: boolean;
  newProduct: NewProduct;
  onEdit: (product: Product) => void;
  onUpdate: () => void;
  onDelete: (id: number) => void;
  onEditingProductChange: Dispatch<SetStateAction<Product | null>>;
  onNewProductChange: Dispatch<SetStateAction<NewProduct>>;
  onAdd: () => void;
  onShowNewRow: () => void;
};

export function ProductTable({
  products,
  categories,
  editingId,
  editingProduct,
  showNewRow,
  newProduct,
  onEdit,
  onUpdate,
  onDelete,
  onEditingProductChange,
  onNewProductChange,
  onAdd,
  onShowNewRow,
}: Props) {
  return (
    <div className="flex-1 p-6">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line text-sm text-ink-muted">
            <th className="text-left py-2 font-medium w-1/3">商品名</th>
            <th className="text-left py-2 font-medium w-1/4">商品カテゴリ</th>
            <th className="text-left py-2 font-medium w-1/6">消費間隔（日）</th>
            <th className="text-left py-2 font-medium">変更・削除</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-line">
              <td className="py-3">
                {editingId === product.id ? (
                  <input
                    type="text"
                    value={editingProduct?.name}
                    onChange={(e) =>
                      onEditingProductChange((prev) =>
                        prev ? { ...prev, name: e.target.value } : null
                      )
                    }
                    className="w-full border-b border-line-strong focus:outline-none focus:border-primary-600 text-sm"
                  />
                ) : (
                  <span className="text-sm text-ink">{product.name}</span>
                )}
              </td>
              <td className="py-3">
                {editingId === product.id ? (
                  <select
                    value={editingProduct?.category_id}
                    onChange={(e) =>
                      onEditingProductChange((prev) =>
                        prev ? { ...prev, category_id: Number(e.target.value) } : null
                      )
                    }
                    className="w-full border-b border-line-strong focus:outline-none text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-ink">
                    {categories.find((c) => c.id === product.category_id)?.name}
                  </span>
                )}
              </td>
              <td className="py-3">
                {editingId === product.id ? (
                  <input
                    type="text"
                    value={editingProduct?.default_consumption_interval_days ?? ''}
                    onChange={(e) =>
                      onEditingProductChange((prev) =>
                        prev ? { ...prev, default_consumption_interval_days: Number(e.target.value) } : null
                      )
                    }
                    className="w-full border-b border-line-strong focus:outline-none focus:border-primary-600 text-sm"
                  />
                ) : (
                  <span className="text-sm text-ink">
                    {product.default_consumption_interval_days ?? '未設定'}
                  </span>
                )}
              </td>
              <td className="py-3">
                {editingId === product.id ? (
                  <button
                    disabled={editingProduct?.name === '' || editingProduct?.category_id === 0 || editingProduct?.default_consumption_interval_days === 0}
                    onClick={onUpdate}
                    className="bg-primary-600 text-white text-sm px-4 py-1 rounded-full hover:bg-primary-700 disabled:bg-disabled disabled:cursor-not-allowed disabled:hover:bg-disabled"
                  >
                    保存
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="bg-primary-600 text-white text-sm px-4 py-1 rounded-full hover:bg-primary-700"
                    >
                      変更
                    </button>
                    <button
                      onClick={() => onDelete(product.id)}
                      className="border border-danger-600 text-danger-600 text-sm px-4 py-1 rounded-full hover:bg-danger-50"
                    >
                      削除
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {showNewRow && (
            <tr className="border-b border-line">
              <td className="py-3">
                <input
                  type="text"
                  placeholder="入力してください"
                  value={newProduct.name}
                  onChange={(e) =>
                    onNewProductChange((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full border-b border-line-strong focus:outline-none focus:border-primary-600 text-sm placeholder-ink-muted"
                />
              </td>
              <td className="py-3">
                <select
                  value={newProduct.category_id}
                  onChange={(e) =>
                    onNewProductChange((prev) => ({ ...prev, category_id: Number(e.target.value) }))
                  }
                  className="w-full border-b border-line-strong focus:outline-none text-sm"
                >
                  <option value={0}>選択してください</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </td>
              <td className="py-3">
                <button
                  onClick={onAdd}
                  className="bg-primary-600 text-white text-sm px-4 py-1 rounded-full hover:bg-primary-700"
                >
                  登録
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <button
          onClick={onShowNewRow}
          className="bg-primary-600 text-white text-sm px-6 py-2 rounded-full hover:bg-primary-700 flex items-center gap-2"
        >
          ＋ 追加
        </button>
      </div>
    </div>
  );
}
