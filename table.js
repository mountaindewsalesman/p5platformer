class p5table {
    constructor(x, y, w, h, data, textSize, padding) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.data = data;
        this.scroll = 0;
        this.textSize = textSize || 12;
        this.padding = padding || 4;
        this.active = true;
    }
    
    draw() {
        if (!this.data || this.data.length === 0) {
            textAlign(CENTER, CENTER);
            textSize(this.textSize);
            fill(150);
            text("No data found", this.x + this.w / 2, this.y + this.h / 2);
            fill(0, 0, 0, 0);
            stroke(0);
            strokeWeight(1);
            rect(this.x, this.y, this.w, this.h);
            return;
        }
        
        let x = this.x;
        let y = this.y;
        let w = this.w;
        let h = this.h;
        let colNames = Object.keys(this.data[0]);
        const headerTextSize = this.textSize * 1.2;
        const rowH = this.textSize + this.padding;
        const headerH = headerTextSize + this.padding;

        // --- FIXED DYNAMIC WIDTH MATH ---
        let maxTextWidths = new Array(colNames.length).fill(10); 
        
        push(); 
        // 1. Measure pure text width without padding
        textSize(headerTextSize);
        textStyle(BOLD);
        for (let j = 0; j < colNames.length; j++) {
            maxTextWidths[j] = Math.max(maxTextWidths[j], textWidth(colNames[j]));
        }
        
        textSize(this.textSize);
        textStyle(NORMAL);
        for (let i = 0; i < this.data.length; i++) {
            let row = this.data[i];
            for (let j = 0; j < colNames.length; j++) {
                let cellData = row[colNames[j]];
                let textToMeasure = (typeof cellData === "object" && cellData !== null) ? Object.keys(cellData)[0] : String(cellData);
                maxTextWidths[j] = Math.max(maxTextWidths[j], textWidth(textToMeasure));
            }
        }
        pop(); 
        
        // 2. Distribute actual width while protecting fixed padding
        let totalTextWidth = maxTextWidths.reduce((sum, val) => sum + val, 0);
        let totalPaddingSpace = (this.padding * 4) * colNames.length;
        let availableTextSpace = this.w - totalPaddingSpace;
        
        let colWidths = [];
        let currentXOffset = [];
        let runningX = 0;
        
        for (let j = 0; j < colNames.length; j++) {
            let finalWidth;
            if (availableTextSpace > totalTextWidth) {
                // Extra space: give standard width + fixed padding + even share of leftover space
                let extraPerCol = (availableTextSpace - totalTextWidth) / colNames.length;
                finalWidth = maxTextWidths[j] + (this.padding * 4) + extraPerCol;
            } else {
                // Too small: shrink text area proportionally, but maintain fixed padding
                if (this.w > totalPaddingSpace) {
                    finalWidth = (maxTextWidths[j] / totalTextWidth) * availableTextSpace + (this.padding * 4);
                } else {
                    finalWidth = this.w / colNames.length; // Extreme fallback
                }
            }
            colWidths.push(finalWidth);
            currentXOffset.push(runningX);
            runningX += finalWidth;
        }
        // -------------------------------------

        push();
        beginClip();
        rect(x, y, w, h);
        endClip();
        
        // Draw the table header
        fill(200);
        strokeWeight(0.5);
        rect(this.x, this.y, this.w, headerH);
        
        // Render header text vertically centered
        textAlign(LEFT, CENTER);
        strokeWeight(0);
        fill(0);
        textSize(headerTextSize);
        textStyle(BOLD);
        for (let j = 0; j < colNames.length; j++) {
            let str = String(colNames[j]);
            let availW = colWidths[j] - this.padding * 2;
            
            // Truncate safely if it overflows
            if (textWidth(str) > availW && str.length > 2) {
                let keep = Math.max(1, Math.floor(availW / (textWidth(str) / str.length)) - 1);
                str = str.substring(0, keep) + "…";
            }
            text(str, this.x + currentXOffset[j] + this.padding, this.y + headerH / 2);
        }
        textStyle(NORMAL);
        
        // Render rows text
        push();
        y = this.y + headerH;
        h = this.h - headerH;
        beginClip();
        rect(x, y, w, h);
        endClip();
        
        let maxI = 0;
        const btnOff = this.textSize * 0.2;
        
        for (let i = 0; i < this.data.length; i++) {
            let rowY = this.y + headerH + i * rowH - this.scroll;
            let rowBottom = rowY + rowH;
            
            if (rowBottom < this.y || rowY > this.y + this.h) continue; // Skip out of bounds      
            
            let row = this.data[i];
            fill(i % 2 == 0 ? 230 : 255);
            rect(this.x, rowY, this.w, rowH);
            fill(0);
            
            for (let j = 0; j < colNames.length; j++) {
                let cellX = this.x + currentXOffset[j];
                let cellW = colWidths[j];

                if (typeof row[colNames[j]] == "object" && row[colNames[j]] !== null) {
                    if (button(cellX + btnOff, rowY + btnOff, cellW - 2 * btnOff, rowH - 2 * btnOff, Object.keys(row[colNames[j]])[0])) {
                        row[colNames[j]][Object.keys(row[colNames[j]])[0]]();
                    }
                } else {
                    let str = String(row[colNames[j]]);
                    let availW = cellW - this.padding * 2;
                    
                    textSize(this.textSize);
                    textAlign(LEFT, CENTER);
                    
                    // Truncate safely if it overflows
                    if (textWidth(str) > availW && str.length > 2) {
                        let keep = Math.max(1, Math.floor(availW / (textWidth(str) / str.length)) - 1);
                        str = str.substring(0, keep) + "…";
                    }
                    text(str, cellX + this.padding, rowY + rowH / 2);
                }
            }
            maxI = i;
        }
        maxI = maxI + 1;
        
        // Fill remaining empty space
        while (this.y + headerH + maxI * rowH - this.scroll < this.y + this.h) {
            fill(maxI % 2 == 0 ? 230 : 255);
            rect(this.x, this.y + headerH + maxI * rowH - this.scroll, this.w, rowH);
            maxI++;
        }
        pop(); // End row clip
        
        // Vertical lines
        for (let j = 1; j < colNames.length; j++) {
            strokeWeight(0.5);
            stroke(0);
            line(this.x + currentXOffset[j], this.y, this.x + currentXOffset[j], this.y + this.h);
        }
        
        // Outline
        fill(0, 0, 0, 0);
        stroke(0);
        strokeWeight(1);
        rect(this.x, this.y, this.w, this.h);
        
        // Scroll prompt
        if (this.scroll == 0 && this.data.length * rowH + headerH > this.h + this.textSize) {
            strokeWeight(5);
            stroke(255);
            fill(0, 0, 0, 200);
            textAlign(CENTER, BOTTOM);
            textSize(this.textSize * 1.2);
            text("(Scroll to see more)", this.x + this.w / 2, this.y + this.h - this.textSize);
        }
        pop();
    }
    
    scrollTable(amount){
        if(!this.active) return;
        let mX = mouseX / scaleFromOrginal;
        let mY = mouseY / scaleFromOrginal;
        if(mX < this.x || mX > this.x + this.w || mY < this.y || mY > this.y + this.h) return;
        this.scroll += amount;
        
        if(this.scroll < 0) this.scroll = 0;
        let maxScroll = Math.max(0, this.data.length * (this.textSize + this.padding) + this.padding - this.h + this.textSize * 1.2);
        if(this.scroll > maxScroll) this.scroll = maxScroll;
    }
}
function mouseWheel(event) {
    mapsTable.scrollTable(event.delta);
}
