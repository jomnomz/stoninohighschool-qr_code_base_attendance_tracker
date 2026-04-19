import React, { Fragment } from 'react';
import styles from './Table.module.css';

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(' ');

const getValue = (valueOrFactory, context) => {
	if (typeof valueOrFactory === 'function') {
		return valueOrFactory(context);
	}

	return valueOrFactory;
};

function Table({
	columns = [],
	rows = [],
	getRowId = (row, index) => row?.id ?? index,
	loading = false,
	error = '',
	emptyMessage = 'No data found',
	containerRef = null,
	gradeTabs = null,
	infoText = '',
	headerContent = null,
	footerContent = null,
	renderTopContent = null,
	tableLabel = '',
	onRowClick = null,
	rowClassName = null,
	expandedRowId = null,
	renderExpandedRow = null,
	expandedRowColSpan = null,
	persistExpandedRows = false,
	hideMainRowWhenExpanded = false,
	getExpandedRowClassName = null,
	getRowProps = null,
	striped = true,
	stickyHeader = false,
	noDataColSpan = null,
	className = '',
	tableClassName = '',
	wrapperClassName = '',
	headClassName = '',
	bodyClassName = '',
	rowKeyPrefix = 'table-row'
}) {
	const resolvedEmptyColSpan = noDataColSpan || columns.length || 1;
	const resolvedExpandedColSpan = expandedRowColSpan || columns.length || 1;

	const renderGradeTabs = () => {
		if (!gradeTabs?.options?.length || !gradeTabs.onChange) {
			return null;
		}

		const {
			options,
			currentValue,
			onChange,
			showAll = false,
			allLabel = 'All',
			renderLabel = (option) => `Grade ${option}`,
			getOptionValue = (option) => option,
			buttonClassName = ''
		} = gradeTabs;

		return (
			<div className={styles.gradeTabs}>
				{showAll && (
					<button
						type="button"
						className={joinClassNames(
							styles.gradeTab,
							currentValue === 'all' && styles.gradeTabActive,
							buttonClassName
						)}
						onClick={() => onChange('all')}
					>
						{allLabel}
					</button>
				)}

				{options.map((option, index) => {
					const optionValue = getOptionValue(option, index);
					const isActive = currentValue === optionValue;

					return (
						<button
							key={`${optionValue}-${index}`}
							type="button"
							className={joinClassNames(
								styles.gradeTab,
								isActive && styles.gradeTabActive,
								buttonClassName
							)}
							onClick={() => onChange(optionValue)}
						>
							{renderLabel(option, index)}
						</button>
					);
				})}
			</div>
		);
	};

	const renderCellContent = (column, row, rowIndex) => {
		if (column.renderCell) {
			return column.renderCell({ row, rowIndex, column });
		}

		if (column.accessor) {
			return getValue(column.accessor, { row, rowIndex, column }) ?? '';
		}

		if (column.key) {
			return row?.[column.key] ?? '';
		}

		return '';
	};

	const renderHeaderCell = (column, columnIndex) => {
		if (column.renderHeader) {
			return column.renderHeader({ column, columnIndex });
		}

		return column.label ?? '';
	};

	const renderRows = () => {
		if (rows.length === 0) {
			return (
				<tr>
					<td colSpan={resolvedEmptyColSpan} className={styles.emptyState}>
						{emptyMessage}
					</td>
				</tr>
			);
		}

		return rows.map((row, rowIndex) => {
			const rowId = getRowId(row, rowIndex);
			const isExpanded = expandedRowId !== null && expandedRowId === rowId;
			const computedRowClassName = getValue(rowClassName, {
				row,
				rowIndex,
				rowId,
				isExpanded
			});
			const extraRowProps = getRowProps?.({ row, rowIndex, rowId, isExpanded }) || {};
			const mainRow = (
				<tr
					{...extraRowProps}
					className={joinClassNames(
						styles.row,
						striped && rowIndex % 2 === 0 ? styles.rowEven : styles.rowOdd,
						isExpanded && styles.rowExpanded,
						onRowClick && styles.rowClickable,
						computedRowClassName,
						extraRowProps.className
					)}
					onClick={onRowClick ? (event) => onRowClick({ row, rowIndex, rowId, event }) : extraRowProps.onClick}
				>
					{columns.map((column, columnIndex) => {
						const cellClassName = getValue(column.cellClassName, {
							row,
							rowIndex,
							column,
							columnIndex,
							rowId,
							isExpanded
						});

						return (
							<td
								key={column.key || `${rowId}-cell-${columnIndex}`}
								className={joinClassNames(styles.cell, cellClassName)}
								style={column.cellStyle}
							>
								{renderCellContent(column, row, rowIndex)}
							</td>
						);
					})}
				</tr>
			);

			const shouldRenderExpandedRow = renderExpandedRow && (persistExpandedRows || isExpanded);
			const expandedRow = shouldRenderExpandedRow ? (
				<tr
					className={joinClassNames(
						styles.expandedRow,
						getValue(getExpandedRowClassName, { row, rowIndex, rowId, isExpanded })
					)}
				>
					<td colSpan={resolvedExpandedColSpan} className={styles.expandedCell}>
						{renderExpandedRow({ row, rowIndex, rowId, isExpanded })}
					</td>
				</tr>
			) : null;

			return (
				<Fragment key={`${rowKeyPrefix}-${rowId}`}>
					{!(hideMainRowWhenExpanded && isExpanded) && mainRow}
					{expandedRow}
				</Fragment>
			);
		});
	};

	return (
		<div className={joinClassNames(styles.container, className)} ref={containerRef}>
			{(renderTopContent || gradeTabs || infoText || headerContent) && (
				<div className={styles.topBar}>
					<div className={styles.topBarLeft}>
						{renderTopContent}
						{renderGradeTabs()}
					</div>

					{(infoText || headerContent) && (
						<div className={styles.topBarRight}>
							{infoText && <div className={styles.infoText}>{infoText}</div>}
							{headerContent}
						</div>
					)}
				</div>
			)}

			{loading ? (
				<div className={styles.stateMessage}>Loading...</div>
			) : error ? (
				<div className={joinClassNames(styles.stateMessage, styles.errorState)}>{error}</div>
			) : (
				<div className={joinClassNames(styles.tableWrapper, wrapperClassName)}>
					<table
						className={joinClassNames(styles.table, stickyHeader && styles.stickyHeader, tableClassName)}
						aria-label={tableLabel}
					>
						<thead className={joinClassNames(styles.head, headClassName)}>
							<tr>
								{columns.map((column, columnIndex) => {
									const headerClassName = getValue(column.headerClassName, { column, columnIndex });

									return (
										<th
											key={column.key || `header-${columnIndex}`}
											className={joinClassNames(styles.headerCell, headerClassName)}
											style={column.headerStyle || column.cellStyle}
											scope="col"
										>
											{renderHeaderCell(column, columnIndex)}
										</th>
									);
								})}
							</tr>
						</thead>

						<tbody className={joinClassNames(styles.body, bodyClassName)}>{renderRows()}</tbody>
					</table>
				</div>
			)}

			{footerContent && <div className={styles.footer}>{footerContent}</div>}
		</div>
	);
}

export default Table;
