import React, { useMemo, useCallback, memo } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
  sortField?: keyof T;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onSort?: (field: keyof T) => void;
  sortConfig?: {
    field: keyof T;
    order: 'asc' | 'desc';
  };
  onRowClick?: (item: T) => void;
}

interface DataTableRowProps<T> {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

function DataTableRow<T extends Record<string, any>>({ 
  item, 
  columns, 
  onRowClick 
}: DataTableRowProps<T>) {
  const renderCell = useCallback((column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return item[column.accessor];
  }, [item]);

  return (
    <tr
      onClick={() => onRowClick?.(item)}
      className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
    >
      {columns.map((column, colIndex) => (
        <td
          key={colIndex}
          className={`px-6 py-4 text-sm text-gray-900 ${column.className || ''}`}
        >
          {renderCell(column)}
        </td>
      ))}
    </tr>
  );
}

const MemoizedDataTableRow = memo(DataTableRow) as typeof DataTableRow;

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  onSort,
  sortConfig,
  onRowClick,
}: DataTableProps<T>) {
  const handleSort = useCallback((column: Column<T>) => {
    if (!column.sortable || !onSort) return;
    const field = column.sortField || column.accessor;
    if (typeof field === 'string') {
      onSort(field as keyof T);
    }
  }, [onSort]);

  const tableHeader = useMemo(() => (
    <thead className="bg-gray-50">
      <tr>
        {columns.map((column, index) => (
          <th
            key={index}
            scope="col"
            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
              column.className || ''
            } ${column.sortable ? 'cursor-pointer select-none' : ''}`}
            onClick={() => column.sortable && handleSort(column)}
          >
            <div className="flex items-center space-x-1">
              <span>{column.header}</span>
              {column.sortable && sortConfig && (
                <span className="ml-2">
                  {(column.sortField || column.accessor) === sortConfig.field ? (
                    sortConfig.order === 'asc' ? '↑' : '↓'
                  ) : (
                    <span className="text-gray-300">↕</span>
                  )}
                </span>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  ), [columns, sortConfig, handleSort]);

  const tableBody = useMemo(() => {
    if (isLoading) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            className="px-6 py-4 text-center text-sm text-gray-500"
          >
            Loading...
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length}
            className="px-6 py-4 text-center text-sm text-gray-500"
          >
            No data available
          </td>
        </tr>
      );
    }

    return data.map((item, rowIndex) => (
      <MemoizedDataTableRow<T>
        key={rowIndex}
        item={item}
        columns={columns}
        onRowClick={onRowClick}
      />
    ));
  }, [data, columns, isLoading, onRowClick]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        {tableHeader}
        <tbody className="bg-white divide-y divide-gray-200">
          {tableBody}
        </tbody>
      </table>
    </div>
  );
}

export default memo(DataTable) as typeof DataTable; 