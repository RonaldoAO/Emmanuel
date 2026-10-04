export function Legend() {
  return (
    <div className="legend panel" role="note" aria-label="Leyenda de colores">
      <div className="legend-item">
        <span className="legend-swatch legend-swatch-green" aria-hidden="true" />
        <span>Cajón ocupado en el momento del recorrido</span>
      </div>
      <div className="legend-item">
        <span className="legend-swatch legend-swatch-yellow" aria-hidden="true" />
        <span>Cajón ocupado por un vehículo diferente al del otro recorrido</span>
      </div>
      <div className="legend-item">
        <span className="legend-swatch legend-swatch-red" aria-hidden="true" />
        <span>Cajón vacío</span>
      </div>
    </div>
  );
}
