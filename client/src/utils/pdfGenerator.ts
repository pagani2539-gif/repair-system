import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateRepairPDF = async (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Print element not found');
    return null;
  }

  // Small delay to ensure images are loaded
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const originalPos = element.style.position;
    const originalLeft = element.style.left;
    
    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.zIndex = '-1';

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1123,
      logging: false,
    });

    element.style.position = originalPos;
    element.style.left = originalLeft;

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    
    return pdf.output('blob');
    
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
