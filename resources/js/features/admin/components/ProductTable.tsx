import { useProductManagement } from '@/features/admin/hooks/useProductManagement';
import type { Category } from '@/shared/types/catalog';
import type { AdminProduct } from '../types';

type Props = {
  products: AdminProduct[];
  categories: Category[];
};

/**
 * 消費間隔の入力値を数値に変換する。
 *
 * 空欄と、数値として読めない入力（日本語入力がオンのままの全角数字など）は
 * 未入力として null にする。Number() の結果をそのまま state に入れると
 * NaN が入力欄に表示されて消せなくなる。
 */
function toDays(value: string): number | null {
  if (value === '') {
    return null;
  }

  const days = Number(value);

  return Number.isNaN(days) ? null : days;
}

export function ProductTable({ products, categories }: Props) {
  const {
    newProduct,
    setNewProduct,
    showNewRow,
    setShowNewRow,
    editingId,
    editingProduct,
    setEditingProduct,
    add,
    edit,
    update,
    remove,
  } = useProductManagement();

  return (
    <div className="flex-1 p-6">
      <table className="w-full">
        <thead>
          <tr className="border-b border-line text-sm text-ink-muted">
            <th className="w-1/3 py-2 text-left font-medium">商品名</th>
            <th className="w-1/4 py-2 text-left font-medium">商品カテゴリ</th>
            <th className="w-1/6 py-2 text-left font-medium">消費間隔（日）</th>
            <th className="py-2 text-left font-medium">変更・削除</th>
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
                      setEditingProduct((prev) => (prev ? { ...prev, name: e.target.value } : null))
                    }
                    className="w-full border-b border-line-strong text-sm focus:border-primary-600 focus:outline-none"
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
                      setEditingProduct((prev) =>
                        prev ? { ...prev, category_id: Number(e.target.value) } : null,
                      )
                    }
                    className="w-full border-b border-line-strong text-sm focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
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
                    type="number"
                    min="1"
                    value={editingProduct?.default_consumption_interval_days ?? ''}
                    onChange={(e) =>
                      setEditingProduct((prev) =>
                        prev
                          ? { ...prev, default_consumption_interval_days: toDays(e.target.value) }
                          : null,
                      )
                    }
                    className="w-full border-b border-line-strong text-sm focus:border-primary-600 focus:outline-none"
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
                    disabled={
                      editingProduct?.name === '' ||
                      editingProduct?.category_id === 0 ||
                      editingProduct?.default_consumption_interval_days === null
                    }
                    onClick={update}
                    className="rounded-full bg-primary-600 px-4 py-1 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-disabled disabled:hover:bg-disabled"
                  >
                    保存
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => edit(product)}
                      className="rounded-full bg-primary-600 px-4 py-1 text-sm text-white hover:bg-primary-700"
                    >
                      変更
                    </button>
                    <button
                      disabled={product.stocks_count > 0}
                      title={
                        product.stocks_count > 0
                          ? '利用者のストックに登録されているため削除できません'
                          : undefined
                      }
                      onClick={() => remove(product.id)}
                      className="rounded-full border border-danger-600 px-4 py-1 text-sm text-danger-600 hover:bg-danger-50 disabled:cursor-not-allowed disabled:border-disabled disabled:text-ink-muted disabled:hover:bg-transparent"
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
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border-b border-line-strong text-sm placeholder-ink-muted focus:border-primary-600 focus:outline-none"
                />
              </td>
              <td className="py-3">
                <select
                  value={newProduct.category_id}
                  onChange={(e) =>
                    setNewProduct((prev) => ({ ...prev, category_id: Number(e.target.value) }))
                  }
                  className="w-full border-b border-line-strong text-sm focus:outline-none"
                >
                  <option value={0}>選択してください</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-3">
                <input
                  type="number"
                  min="1"
                  placeholder="入力してください"
                  value={newProduct.default_consumption_interval_days ?? ''}
                  onChange={(e) =>
                    setNewProduct((prev) => ({
                      ...prev,
                      default_consumption_interval_days: toDays(e.target.value),
                    }))
                  }
                  className="w-full border-b border-line-strong text-sm placeholder-ink-muted focus:border-primary-600 focus:outline-none"
                />
              </td>
              <td className="py-3">
                <button
                  disabled={
                    newProduct.name === '' ||
                    newProduct.category_id === 0 ||
                    newProduct.default_consumption_interval_days === null
                  }
                  onClick={add}
                  className="rounded-full bg-primary-600 px-4 py-1 text-sm text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-disabled disabled:hover:bg-disabled"
                >
                  登録
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setShowNewRow(true)}
          className="flex items-center gap-2 rounded-full bg-primary-600 px-6 py-2 text-sm text-white hover:bg-primary-700"
        >
          ＋ 追加
        </button>
      </div>
    </div>
  );
}
