import { useEffect, useRef, useState } from 'react';
import { CuadraTable } from './components/CuadraTable';
import { Legend } from './components/Legend';
import { normalizeIntegerInput, normalizeDecimalInput } from './domain/numberInput';
import {
  addCajon,
  addRecorrido,
  appendCuadraFromGrid,
  createInitialState,
  removeCajon,
  removeRecorrido,
  renameCuadra,
  setCellValue,
  setCuadraCount,
  setHoras,
} from './domain/operations';
import { loadState, saveState } from './domain/persistence';
import type { AppState } from './domain/types';
import { downloadAllCuadrasExcel } from './export/exportExcel';
import { importExcelFile } from './import/importExcel';

const AUTOSAVE_DEBOUNCE_MS = 400;

function App() {
  const [state, setState] = useState<AppState>(() => loadState() ?? createInitialState());
  const [cuadrasDraft, setCuadrasDraft] = useState(String(state.cuadras.length));
  const [horasDraft, setHorasDraft] = useState(String(state.horas).replace('.', ','));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [exportingAll, setExportingAll] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        saveState(state);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state]);

  // Keeps the "Número de cuadras" field in sync after an import adds cuadras
  // directly (bypassing the Aplicar flow), so it doesn't show a stale count.
  useEffect(() => {
    setCuadrasDraft(String(state.cuadras.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cuadras.length]);

  function applySettings(e?: React.FormEvent) {
    e?.preventDefault();

    const cuadrasValue = normalizeIntegerInput(cuadrasDraft);
    if (cuadrasValue === null || cuadrasValue < 0) {
      setCuadrasDraft(String(state.cuadras.length));
    } else {
      setState((prev) => setCuadraCount(prev, cuadrasValue));
    }

    const horasValue = normalizeDecimalInput(horasDraft);
    if (horasValue === null || horasValue <= 0) {
      setHorasDraft(String(state.horas).replace('.', ','));
    } else {
      setState((prev) => setHoras(prev, horasValue));
    }
  }

  async function handleDownloadAllExcel() {
    if (exportingAll || state.cuadras.length === 0) return;
    setExportingAll(true);
    try {
      await downloadAllCuadrasExcel(state.cuadras, state.horas, state.observations);
    } finally {
      setExportingAll(false);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportErrors(null);
    setImportSuccessCount(null);
    try {
      const result = await importExcelFile(file);
      if (result.errors.length > 0) {
        setImportErrors(result.errors);
        return;
      }
      setState((prev) => {
        let next = prev;
        for (const block of result.blocks) {
          next = appendCuadraFromGrid(next, block);
        }
        return next;
      });
      setImportSuccessCount(result.blocks.length);
    } catch {
      setImportErrors(['No se pudo importar el archivo. Verifica que sea un .xlsx válido.']);
    } finally {
      setImporting(false);
    }
  }

  const saveLabel =
    saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Guardado en este dispositivo.' : saveStatus === 'error' ? 'No se pudo guardar.' : '';

  return (
    <div className="app-shell">
      <header className="top-bar">
        <h1>Oferta y demanda de estacionamiento</h1>
        <form className="row-center" onSubmit={applySettings}>
          <div className="field">
            <label htmlFor="cuadras-count">Número de cuadras</label>
            <input
              id="cuadras-count"
              type="text"
              inputMode="numeric"
              value={cuadrasDraft}
              onChange={(e) => setCuadrasDraft(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="horas-count">Horas</label>
            <input
              id="horas-count"
              type="text"
              inputMode="decimal"
              value={horasDraft}
              onChange={(e) => setHorasDraft(e.target.value)}
            />
          </div>
          <button type="submit" className="btn">
            Aplicar
          </button>
          <div className="spacer" />
          <button type="button" className="btn" onClick={handleImportClick} disabled={importing}>
            {importing ? 'Importando…' : 'Importar Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="visually-hidden"
            onChange={handleFileSelected}
            aria-label="Seleccionar archivo Excel para importar"
          />
          <button
            type="button"
            className="btn"
            onClick={handleDownloadAllExcel}
            disabled={exportingAll || state.cuadras.length === 0}
          >
            Descargar todo en Excel
          </button>
          <span className={`save-status${saveStatus === 'error' ? ' error' : ''}`} role="status" aria-live="polite">
            {saveLabel}
          </span>
        </form>
      </header>

      <main className="app-main">
        {importErrors && (
          <div className="panel" role="alert">
            <h3>No se pudo importar el archivo</h3>
            <ul>
              {importErrors.map((err, i) => (
                <li key={i} className="field-error-inline">
                  {err}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-sm" onClick={() => setImportErrors(null)}>
              Cerrar
            </button>
          </div>
        )}
        {importSuccessCount !== null && (
          <div className="panel" role="status">
            <p>
              Se {importSuccessCount === 1 ? 'importó 1 cuadra nueva' : `importaron ${importSuccessCount} cuadras nuevas`}{' '}
              al final de la lista.
            </p>
            <button type="button" className="btn btn-sm" onClick={() => setImportSuccessCount(null)}>
              Cerrar
            </button>
          </div>
        )}

        <Legend />

        {state.cuadras.length === 0 ? (
          <p className="text-muted">
            Indica un número de cuadras mayor que 0 para empezar a generar las tablas.
          </p>
        ) : (
          <div className="cuadras-list">
            {state.cuadras.map((cuadra, index) => (
              <CuadraTable
                key={cuadra.id}
                cuadra={cuadra}
                cuadraIndex={index}
                horas={state.horas}
                observations={state.observations}
                onAddCajon={(cuadraId) => setState((prev) => addCajon(prev, cuadraId))}
                onAddRecorrido={(cuadraId) => setState((prev) => addRecorrido(prev, cuadraId))}
                onRemoveCajon={(cuadraId, cajonId) => setState((prev) => removeCajon(prev, cuadraId, cajonId))}
                onRemoveRecorrido={(cuadraId, recorridoId) =>
                  setState((prev) => removeRecorrido(prev, cuadraId, recorridoId))
                }
                onSetCellValue={(cuadraId, cajonId, recorridoId, value) =>
                  setState((prev) => setCellValue(prev, cuadraId, cajonId, recorridoId, value))
                }
                onRenameCuadra={(cuadraId, name) => setState((prev) => renameCuadra(prev, cuadraId, name))}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
