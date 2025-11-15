const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFReceiptGenerator {
  constructor() {
    this.companyInfo = {
      name: 'Edwards Tech Solutions',
      website: 'https://edwardstech.dev'
    };
  }

  async generateReceipt(order, outputPath = null) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        
        // If no output path provided, return buffer
        let buffers = [];
        if (!outputPath) {
          doc.on('data', buffers.push.bind(buffers));
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
          });
        } else {
          // Write to file
          const stream = fs.createWriteStream(outputPath);
          doc.pipe(stream);
          stream.on('finish', () => resolve(outputPath));
          stream.on('error', reject);
        }

        // Header
        this.addHeader(doc);
        
        // Receipt title
        doc.fontSize(24)
           .fillColor('#2563eb')
           .text('RECEIPT', 50, 135, { align: 'center' });

        // Order information
        doc.fontSize(12)
           .fillColor('#000000')
           .text(`Receipt #: ${order.id}`, 50, 175)
           .text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 50, 195)
           .text(`Status: ${order.status.toUpperCase()}`, 50, 215);

        // Customer information
        doc.fontSize(14)
           .fillColor('#1f2937')
           .text('Bill To:', 50, 245);

        doc.fontSize(12)
           .fillColor('#000000')
           .text(order.customer_name, 50, 265)
           .text(order.customer_email, 50, 285);

        if (order.customer_phone) {
          doc.text(order.customer_phone, 50, 305);
        }

        // Billing address
        if (order.billing_address) {
          const billing = typeof order.billing_address === 'string' 
            ? JSON.parse(order.billing_address) 
            : order.billing_address;
          
          doc.text(`${billing.street}`, 50, 325)
             .text(`${billing.city}, ${billing.state} ${billing.zip}`, 50, 345);
        }

        // Shipping address (if different)
        if (order.shipping_address) {
          const shipping = typeof order.shipping_address === 'string' 
            ? JSON.parse(order.shipping_address) 
            : order.shipping_address;
          
          const billing = typeof order.billing_address === 'string' 
            ? JSON.parse(order.billing_address) 
            : order.billing_address;

          // Only show shipping if different from billing
          const isDifferent = JSON.stringify(shipping) !== JSON.stringify(billing);
          
          if (isDifferent) {
            doc.fontSize(14)
               .fillColor('#1f2937')
               .text('Ship To:', 300, 245);

            doc.fontSize(12)
               .fillColor('#000000')
               .text(`${shipping.street}`, 300, 265)
               .text(`${shipping.city}, ${shipping.state} ${shipping.zip}`, 300, 285);
          }
        }

        // Items table
        const tableTop = 385;
        this.addItemsTable(doc, order.items, tableTop);

        // Calculate and display total
        const itemsTotal = order.items.reduce((sum, item) => sum + parseFloat(item.price || item.amount || 0), 0);
        const totalY = tableTop + 60 + (order.items.length * 30);
        
        // Add subtotal line
        doc.moveTo(350, totalY - 10)
           .lineTo(500, totalY - 10)
           .stroke('#e5e7eb');
        
        // Position total label and amount with proper spacing
        doc.fontSize(14)
           .fillColor('#1f2937')
           .text('Total Amount:', 350, totalY);
        
        // Add the total amount with proper spacing on the same line
        doc.fontSize(16)
           .fillColor('#059669')
           .text(`$${itemsTotal.toFixed(2)}`, 450, totalY);

        // Payment information
        if (order.payment_intent_id) {
          doc.fontSize(10)
             .fillColor('#6b7280')
             .text(`Payment ID: ${order.payment_intent_id}`, 50, totalY + 60);
        }

        // Tracking information
        if (order.tracking_number) {
          doc.fontSize(12)
             .fillColor('#1f2937')
             .text('Tracking Number:', 50, totalY + 100)
             .fillColor('#2563eb')
             .text(order.tracking_number, 150, totalY + 100);
        }

        // Footer
        this.addFooter(doc, totalY + 140);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc) {
    // Try to use the actual logo, fall back to text
    const logoPath = path.join(__dirname, '../src/assets/Engineering_logo.png');
    
    if (fs.existsSync(logoPath)) {
      try {
        // Add logo image
        doc.image(logoPath, 50, 45, { width: 60, height: 40 });
        
        // Company name next to logo
        doc.fontSize(18)
           .fillColor('#2563eb')
           .text('EDWARDS TECH SOLUTIONS', 120, 55);
      } catch (error) {
        // Fallback to text-only header
        console.log('Logo not found, using text header');
        doc.fontSize(22)
           .fillColor('#2563eb')
           .text('EDWARDS TECH SOLUTIONS', 50, 50);
      }
    } else {
      // Fallback to text-only header
      doc.fontSize(22)
         .fillColor('#2563eb')
         .text('EDWARDS TECH SOLUTIONS', 50, 50);
    }

    // Website only
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(`Visit: ${this.companyInfo.website}`, 50, 95);

    // Header line
    doc.moveTo(50, 115)
       .lineTo(550, 115)
       .stroke('#e5e7eb');
  }

  addItemsTable(doc, items, startY) {
    // Table headers
    const headerY = startY;
    doc.fontSize(12)
       .fillColor('#1f2937')
       .text('Item', 50, headerY)
       .text('Qty', 250, headerY, { align: 'center' })
       .text('Total Price', 450, headerY, { align: 'right' });

    // Header line
    doc.moveTo(50, headerY + 20)
       .lineTo(500, headerY + 20)
       .stroke('#e5e7eb');

    // Items
    items.forEach((item, index) => {
      const itemY = headerY + 40 + (index * 30);
      
      doc.fontSize(10)
         .fillColor('#000000')
         .text(item.name || item.description || 'Custom Project', 50, itemY)
         .text('1', 250, itemY, { align: 'center' })
         .text(`$${parseFloat(item.price || item.amount || 0).toFixed(2)}`, 350, itemY, { align: 'right' })
         .text(`$${parseFloat(item.price || item.amount || 0).toFixed(2)}`, 450, itemY, { align: 'right' });
    });

    // Bottom line
    const bottomY = headerY + 40 + (items.length * 30) + 10;
    doc.moveTo(350, bottomY)
       .lineTo(500, bottomY)
       .stroke('#e5e7eb');
  }

  addFooter(doc, startY) {
    doc.fontSize(8)
       .fillColor('#6b7280')
       .text('Thank you for your business!', 50, startY, { align: 'center' })
       .text(`Visit us at ${this.companyInfo.website}`, 50, startY + 15, { align: 'center' })
       .text('This is an electronically generated receipt.', 50, startY + 35, { align: 'center' });
  }
}

module.exports = PDFReceiptGenerator;