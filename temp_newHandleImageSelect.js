    async function handleImageSelect() {
      const fileInput = document.getElementById('imageFiles');
      const files = Array.from(fileInput.files);
      
      if (files.length === 0) {
        document.getElementById('analyzingMsg').classList.add('hidden');
        buttonsData = [];
        return;
      }

      const analyzingMsg = document.getElementById('analyzingMsg');
      const analyzeText = document.getElementById('analyzeText');
      
      analyzeText.textContent = `Uploading ${files.length} image(s)...`;
      analyzingMsg.classList.remove('hidden');

      try {
        const formData = new FormData();
        files.forEach(file => formData.append('images', file));

        analyzeText.textContent = `Analyzing ${files.length} image(s) with AI...`;
        
        const res = await fetch(API_URL + '/api/v1/upload', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          
          // Check if batch mode (multiple buttons) or single mode
          if (data.data.buttons && data.data.buttons.length > 1) {
            // BATCH MODE: Multiple button pairs detected
            buttonsData = data.data.buttons;
            uploadedImages = [];
            
            const previewDiv = document.getElementById('imagePreview');
            let allImages = [];
            buttonsData.forEach(btn => allImages.push(...btn.images));
            
            previewDiv.innerHTML = allImages.map((img, idx) => `
              <div class="image-preview-item">
                <img src="${API_URL}${img.url}" alt="Preview ${idx + 1}">
              </div>
            `).join('');
            
            const createBtn = document.getElementById('createBtn');
            createBtn.textContent = `Create All ${buttonsData.length} Buttons`;
            
            analyzeText.textContent = `✓ ${buttonsData.length} buttons detected! Click to create all.`;
            setTimeout(() => analyzingMsg.classList.add('hidden'), 3000);
            showMsg(`✓ ${buttonsData.length} buttons detected from ${files.length} images!`, 'success');
            
          } else if (data.data.buttons && data.data.buttons.length === 1) {
            // SINGLE MODE: One button pair
            buttonsData = [];
            const button = data.data.buttons[0];
            uploadedImages = button.images;
            
            const previewDiv = document.getElementById('imagePreview');
            previewDiv.innerHTML = uploadedImages.map((img, idx) => `
              <div class="image-preview-item">
                <img src="${API_URL}${img.url}" alt="Preview ${idx + 1}">
                <button class="remove" onclick="removeImage(${idx})" title="Remove">×</button>
              </div>
            `).join('');
            
            const info = button.buttonInfo;
            if (info) {
              if (info.material) document.getElementById('material').value = info.material;
              if (info.size) document.getElementById('size').value = info.size;
              if (info.diameter) document.getElementById('diameter').value = info.diameter;
              if (info.color) document.getElementById('color').value = info.color;
              if (info.holes != null) document.getElementById('holes').value = info.holes;
              if (info.style) document.getElementById('style').value = info.style;
              if (info.nbsCode) document.getElementById('nbsCode').value = info.nbsCode;
              if (info.buttonCondition) document.getElementById('buttonCondition').value = info.buttonCondition;
              if (info.manufacturer) document.getElementById('manufacturer').value = info.manufacturer;
              if (info.notes) document.getElementById('notes').value = info.notes;
              
              analyzeText.textContent = `✓ Button analyzed successfully!`;
              setTimeout(() => analyzingMsg.classList.add('hidden'), 3000);
              showMsg(`✓ Button analyzed! Fields auto-populated.`, 'success');
            } else {
              analyzeText.textContent = `✓ Images uploaded`;
              setTimeout(() => analyzingMsg.classList.add('hidden'), 2000);
              showMsg(`Images uploaded`, 'success');
            }
            
            const createBtn = document.getElementById('createBtn');
            createBtn.textContent = 'Create Button Entry';
          }
        } else {
          const errorData = await res.json();
          console.error('Upload failed:', errorData);
          analyzingMsg.classList.add('hidden');
          fileInput.value = '';
          document.getElementById('imagePreview').innerHTML = '';
          uploadedImages = [];
          buttonsData = [];
          showMsg('Upload failed: ' + (errorData.error?.message || res.statusText), 'error');
        }
      } catch (err) {
        console.error('Upload error:', err);
        analyzingMsg.classList.add('hidden');
        fileInput.value = '';
        document.getElementById('imagePreview').innerHTML = '';
        uploadedImages = [];
        buttonsData = [];
        showMsg('Upload error: ' + err.message, 'error');
      }
    }
