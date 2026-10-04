import html2canvas from 'html2canvas';

export async function downloadElementAsImage(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, { backgroundColor: '#ffffff', scale: 2 });
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
