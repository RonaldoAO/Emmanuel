import { useRef, useState } from 'react';
import { calculateCuadraResult, deriveRowColors, getCellKey } from '../domain/calculations';
import { formatNumberEs, formatPercentEs } from '../domain/format';
import { sanitizePlateInput } from '../domain/plateInput';
import type { Cuadra, ObservationsMap } from '../domain/types';
import { downloadElementAsImage } from '../export/exportImage';
import { cuadraDisplayName, downloadCuadraExcel } from '../export/exportExcel';
import { ContextMenu, type ContextMenuState } from './ContextMenu';

interface CuadraTableProps {
  cuadra: Cuadra;
  cuadraIndex: number;
  horas: number;
  observations: ObservationsMap;
  onAddCajon: (cuadraId: string) => void;
  onAddRecorrido: (cuadraId: string) => void;
  onRemoveCajon: (cuadraId: string, cajonId: string) => void;
  onRemoveRecorrido: (cuadraId: string, recorridoId: string) => void;
  onSetCellValue: (cuadraId: string, cajonId: string, recorridoId: string, value: string) => void;
  onRenameCuadra: (cuadraId: string, name: string | null) => void;
}

export function CuadraTable({
  cuadra,
  cuadraIndex,
  horas,
  observations,
  onAddCajon,
  onAddRecorrido,
  onRemoveCajon,
  onRemoveRecorrido,
  onSetCellValue,
  onRenameCuadra,
}: CuadraTableProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [selectedCol, setSelectedCol] = useState<string | null>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const defaultName = `Cuadra ${cuadraIndex + 1}`;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(cuadra.name ?? defaultName);

  const result = calculateCuadraResult(cuadra, horas, observations);

  function startEditingName() {
    setNameDraft(cuadra.name ?? defaultName);
    setIsEditingName(true);
  }

  function commitName() {
    setIsEditingName(false);
    onRenameCuadra(cuadra.id, nameDraft);
  }

  function clearSelection() {
    setSelectedRow(null);
    setSelectedCol(null);
  }

  function handleCajonContextMenu(e: React.MouseEvent, cajonId: string, cajonNumber: number) {
    e.preventDefault();
    setSelectedRow(cajonId);
    setSelectedCol(null);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      label: `Eliminar cajón ${cajonNumber}`,
      onDelete: () => onRemoveCajon(cuadra.id, cajonId),
    });
  }

  function handleRecorridoContextMenu(e: React.MouseEvent, recorridoId: string, recorridoNumber: number) {
    e.preventDefault();
    setSelectedCol(recorridoId);
    setSelectedRow(null);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      label: `Eliminar recorrido ${recorridoNumber}`,
      onDelete: () => onRemoveRecorrido(cuadra.id, recorridoId),
    });
  }

  function handleCellChange(cajonId: string, recorridoId: string, raw: string) {
    onSetCellValue(cuadra.id, cajonId, recorridoId, sanitizePlateInput(raw));
  }

  async function handleDownloadImage() {
    if (!tableWrapRef.current || exporting) return;
    setExporting(true);
    try {
      await downloadElementAsImage(tableWrapRef.current, `${cuadraDisplayName(cuadra, cuadraIndex)}.png`);
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadExcel() {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadCuadraExcel(cuadra, cuadraIndex, horas, observations);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="cuadra-card">
      <div ref={tableWrapRef} className="cuadra-card-capture">
        <h2 className="cuadra-title">
          {isEditingName ? (
            <input
              type="text"
              className="cuadra-title-input"
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setIsEditingName(false);
                }
              }}
              aria-label="Nombre de la cuadra"
            />
          ) : (
            <button
              type="button"
              className="cuadra-title-btn"
              onClick={startEditingName}
              title="Click para renombrar"
            >
              {cuadra.name ?? defaultName}
            </button>
          )}
        </h2>

        <div className="table-wrap">
          <table className="cuadra-table">
            <thead>
              <tr>
                <th rowSpan={2} className="cajones-header">
                  # cajones
                </th>
                {cuadra.recorridos.length > 0 && (
                  <th colSpan={cuadra.recorridos.length}>Recorridos</th>
                )}
                <th rowSpan={2} className="add-col">
                  <button type="button" className="btn btn-sm" onClick={() => onAddRecorrido(cuadra.id)}>
                    + Recorrido
                  </button>
                </th>
              </tr>
              <tr>
                {cuadra.recorridos.map((rec, i) => (
                  <th
                    key={rec.id}
                    className={selectedCol === rec.id ? 'col-selected' : ''}
                    onContextMenu={(e) => handleRecorridoContextMenu(e, rec.id, i + 1)}
                    title="Click derecho para eliminar este recorrido"
                  >
                    Recorrido {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuadra.cajones.map((cajon, cajonIndex) => {
                const rowColors = deriveRowColors(cuadra, cajon.id, observations);
                return (
                  <tr key={cajon.id} className={selectedRow === cajon.id ? 'row-selected' : ''}>
                    <th
                      scope="row"
                      onContextMenu={(e) => handleCajonContextMenu(e, cajon.id, cajonIndex + 1)}
                      title="Click derecho para eliminar este cajón"
                    >
                      {cajonIndex + 1}
                    </th>
                    {cuadra.recorridos.map((rec, recIndex) => {
                      const key = getCellKey(cuadra.id, cajon.id, rec.id);
                      const value = observations[key] ?? '';
                      const color = rowColors[recIndex];
                      return (
                        <td
                          key={rec.id}
                          className={`cuadra-cell cuadra-cell-${color}${selectedCol === rec.id ? ' col-selected' : ''}`}
                        >
                          <input
                            type="text"
                            autoCapitalize="characters"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            className="cell-value-input"
                            value={value}
                            placeholder="—"
                            onChange={(e) => handleCellChange(cajon.id, rec.id, e.target.value)}
                            aria-label={`Cajón ${cajonIndex + 1}, recorrido ${recIndex + 1}, ${
                              value === '' ? 'vacío' : `vehículo ${value}`
                            }`}
                          />
                        </td>
                      );
                    })}
                    <td className="add-col" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button type="button" className="btn btn-sm add-cajon-btn" onClick={() => onAddCajon(cuadra.id)}>
          + Agregar cajón
        </button>

        <div className="cuadra-results">
          <p>
            <strong>Oferta:</strong> {result.oferta} cajones
          </p>
          <p>
            <strong>Demanda:</strong> {result.demanda} vehículos
          </p>
          <p>
            <strong>Cajones vacíos promedio:</strong> {formatNumberEs(result.vaciosPromedio)}
          </p>
          <p>
            <strong>Ir (índice de rotación)</strong> = Demanda / (Oferta × Horas) = {result.demanda}/(
            {result.C}×{formatNumberEs(result.T)}) = {formatNumberEs(result.rotacion, 6)}{' '}
            <span className="text-muted text-sm">veh/cajón/hora</span>
          </p>
          <p>
            <strong>De (duración del ejemplo)</strong> = 1 / Ir ={' '}
            {result.duracionHoras === null
              ? 'No calculable: no se observaron vehículos'
              : `${formatNumberEs(result.duracionHoras, 4)} horas (${formatNumberEs(result.duracionMinutos as number, 2)} min)`}
          </p>
          <p>
            <strong>Uc (utilización de capacidad)</strong> = (Oferta − Cajones vacíos) / Oferta ={' '}
            {formatPercentEs(result.utilizacion)}
          </p>
        </div>
      </div>

      <div className="row-center cuadra-export-actions">
        <button type="button" className="btn btn-sm" onClick={handleDownloadImage} disabled={exporting}>
          Descargar imagen
        </button>
        <button type="button" className="btn btn-sm" onClick={handleDownloadExcel} disabled={exporting}>
          Descargar Excel
        </button>
      </div>

      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => {
            setContextMenu(null);
            clearSelection();
          }}
        />
      )}
    </section>
  );
}
