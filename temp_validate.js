
    const API_URL = 'http://localhost:4000';
    let token = localStorage.getItem('token');
    let userEmail = localStorage.getItem('userEmail');
    let uploadedImages = [];
    let buttonsData = []; // For batch mode

    // Ensure analyzing message is hidden on page load
    document.addEventListener('DOMContentLoaded', function() {
      const analyzingMsg = document.getElementById('analyzingMsg');
      if (analyzingMsg) analyzingMsg.classList.add('hidden');
    });

    if (token) showLoggedIn();

    function showLoading(text) {
      document.getElementById('loadingText').textContent = text || 'Processing...';
      document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    function hideLoading() {
      document.getElementById('loadingOverlay').classList.add('hidden');
    }

    function showReg() {
      document.getElementById('confirmPassword').classList.remove('hidden');
      document.getElementById('regBtn').textContent = 'Create Account';
      document.getElementById('regBtn').onclick = doRegister;
    }

    function togglePwd() {
      const pwd = document.getElementById('password');
      const confirm = document.getElementById('confirmPassword');
      const newType = pwd.type === 'password' ? 'text' : 'password';
      pwd.type = newType;
      if (confirm) confirm.type = newType;
    }

    async function doRegister() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const username = email.split('@')[0];

      if (!email || !password) return showMsg('Email and password required', 'error');
      if (password !== confirmPassword) return showMsg('Passwords do not match', 'error');

      showLoading('Creating account...');
      try {
        const res = await fetch(API_URL + '/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        hideLoading();
        
        if (res.ok) {
          token = data.data.accessToken;
          userEmail = email;
          localStorage.setItem('token', token);
          localStorage.setItem('userEmail', userEmail);
          showMsg('Registration successful!', 'success');
          document.getElementById('confirmPassword').classList.add('hidden');
          showLoggedIn();
        } else {
          showMsg(data.error?.message || 'Registration failed', 'error');
        }
      } catch (err) {
        hideLoading();
        showMsg('Network error: ' + err.message, 'error');
      }
    }

    async function doLogin() {
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (!email || !password) return showMsg('Email and password required', 'error');

      showLoading('Logging in...');
      try {
        const res = await fetch(API_URL + '/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        hideLoading();
        
        if (res.ok) {
          token = data.data.accessToken;
          userEmail = email;
          localStorage.setItem('token', token);
          localStorage.setItem('userEmail', userEmail);
          showMsg('Login successful!', 'success');
          showLoggedIn();
        } else {
          showMsg(data.error?.message || 'Login failed', 'error');
        }
      } catch (err) {
        hideLoading();
        showMsg('Network error: ' + err.message, 'error');
      }
    }

    function doLogout() {
      token = null;
      userEmail = null;
      uploadedImages = [];
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('loggedInSection').classList.add('hidden');
      document.getElementById('createSection').classList.add('hidden');
      document.getElementById('confirmPassword').classList.add('hidden');
      document.getElementById('itemsSection').innerHTML = '';
      document.getElementById('regBtn').textContent = 'Register';
      document.getElementById('regBtn').onclick = showReg;
      showMsg('Logged out', 'success');
    }

    function showLoggedIn() {
      document.getElementById('authSection').classList.add('hidden');
      document.getElementById('loggedInSection').classList.remove('hidden');
      document.getElementById('createSection').classList.remove('hidden');
      document.getElementById('userEmail').textContent = userEmail;
      document.getElementById('analyzingMsg').classList.add('hidden');
      loadItems();
    }

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
              // Auto-populate title with NBS code or descriptive name
              // Auto-populate title
              let titleValue = '';
              if (info.nbsCode) {
                titleValue = info.nbsCode;
              } else {
                let titleParts = [];
                if (info.material) titleParts.push(info.material);
                if (info.color) titleParts.push(info.color);
                if (info.style) titleParts.push(info.style);
                if (info.pictorialSubject) titleParts.push(info.pictorialSubject);
                titleValue = titleParts.join(' ');
              }
              document.getElementById('title').value = titleValue || 'Button 1';

              if (info.material) document.getElementById('material').value = info.material;
              if (info.size) document.getElementById('size').value = info.size;
              if (info.diameter) document.getElementById('diameter').value = info.diameter;
              if (info.color) document.getElementById('color').value = info.color;
              if (info.holes != null) document.getElementById('holes').value = info.holes;
              if (info.style) document.getElementById('style').value = info.style;
              if (info.nbsCode) document.getElementById('nbsCode').value = info.nbsCode;
              if (info.division) document.getElementById('division').value = info.division;
              if (info.section != null) document.getElementById('section').value = info.section;
              if (info.sectionName) document.getElementById('sectionName').value = info.sectionName;
              if (info.age) document.getElementById('age').value = info.age;
              if (info.backType) document.getElementById('backType').value = info.backType;
              if (info.pictorialSubject) document.getElementById('pictorialSubject').value = info.pictorialSubject;
              if (info.pattern) document.getElementById('pattern').value = info.pattern;
              if (info.usageType) document.getElementById('usageType').value = info.usageType;
              if (info.buttonCondition) document.getElementById('buttonCondition').value = info.buttonCondition;
              if (info.manufacturer) document.getElementById('manufacturer').value = info.manufacturer;
              if (info.notes) document.getElementById('notes').value = info.notes;
              
              analyzeText.textContent = `✓ Button analyzed successfully!`;
              setTimeout(() => analyzingMsg.classList.add('hidden'), 3000);
              showMsg(`✓ Button analyzed! Fields auto-populated.`, 'success');
              }
            } else {
              // No AI data
              document.getElementById('title').value = 'Button 1';
            }

            // Final fallback for title
            if (!document.getElementById('title').value) {
              document.getElementById('title').value = 'Button 1';
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

    function removeImage(index) {
      uploadedImages.splice(index, 1);
      const previewDiv = document.getElementById('imagePreview');
      previewDiv.innerHTML = uploadedImages.map((img, idx) => `
        <div class="image-preview-item">
          <img src="${API_URL}${img.url}" alt="Preview ${idx + 1}">
          <button class="remove" onclick="removeImage(${idx})" title="Remove">×</button>
        </div>
      `).join('');
    }

    async function createItem() {
      // Check if batch mode
      if (buttonsData.length > 0) {
        return await createBatchButtons();
      }
      
      // Single mode
      const title = document.getElementById('title').value;
      if (!title) return showMsg('Button name/title required', 'error');

      const createBtn = document.getElementById('createBtn');
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';
      
      showLoading('Saving button entry...');

      try {
        const res = await fetch(API_URL + '/api/v1/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ 
            title,
            content: document.getElementById('content').value,
            images: uploadedImages,
            material: document.getElementById('material').value,
            size: document.getElementById('size').value,
            diameter: document.getElementById('diameter').value,
            color: document.getElementById('color').value,
            holes: document.getElementById('holes').value ? parseInt(document.getElementById('holes').value) : null,
            style: document.getElementById('style').value,
            nbsCode: document.getElementById('nbsCode').value,
            division: document.getElementById('division').value,
            section: document.getElementById('section').value ? parseInt(document.getElementById('section').value) : null,
            sectionName: document.getElementById('sectionName').value,
            age: document.getElementById('age').value,
            backType: document.getElementById('backType').value,
            pictorialSubject: document.getElementById('pictorialSubject').value,
            pattern: document.getElementById('pattern').value,
            usageType: document.getElementById('usageType').value,
            buttonCondition: document.getElementById('buttonCondition').value,
            manufacturer: document.getElementById('manufacturer').value,
            notes: document.getElementById('notes').value
          })
        });

        hideLoading();
        createBtn.disabled = false;
        createBtn.textContent = 'Create Button Entry';

        if (res.ok) {
          showMsg('✓ Button entry created successfully!', 'success');
          clearForm();
          loadItems();
        } else {
          const errorData = await res.json();
          showMsg('Failed to create: ' + (errorData.error?.message || res.statusText), 'error');
        }
      } catch (err) {
        hideLoading();
        createBtn.disabled = false;
        createBtn.textContent = 'Create Button Entry';
        showMsg('Network error: ' + err.message, 'error');
        console.error('Create error:', err);
      }
    }

    async function createBatchButtons() {
      const createBtn = document.getElementById('createBtn');
      createBtn.disabled = true;
      
      showLoading(`Creating ${buttonsData.length} buttons...`);
      
      let successCount = 0;
      let failCount = 0;
      
      try {
        for (let i = 0; i < buttonsData.length; i++) {
          const button = buttonsData[i];
          const buttonNum = i + 1;
          
          showLoading(`Creating button ${buttonNum} of ${buttonsData.length}...`);
          
          try {
            const res = await fetch(API_URL + '/api/v1/items', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({
                title: button.buttonInfo.nbsCode || `Button ${buttonNum}`,
                images: button.images,
                material: button.buttonInfo.material || '',
                size: button.buttonInfo.size || '',
                diameter: button.buttonInfo.diameter || '',
                color: button.buttonInfo.color || '',
                holes: button.buttonInfo.holes || null,
                style: button.buttonInfo.style || '',
                nbsCode: button.buttonInfo.nbsCode || '',
                division: button.buttonInfo.division || '',
                section: button.buttonInfo.section || null,
                sectionName: button.buttonInfo.sectionName || '',
                age: button.buttonInfo.age || '',
                backType: button.buttonInfo.backType || '',
                pictorialSubject: button.buttonInfo.pictorialSubject || '',
                pattern: button.buttonInfo.pattern || '',
                usageType: button.buttonInfo.usageType || '',
                buttonCondition: button.buttonInfo.buttonCondition || '',
                manufacturer: button.buttonInfo.manufacturer || '',
                notes: button.buttonInfo.notes || '',
                content: ''
              })
            });
            
            if (res.ok) {
              successCount++;
            } else {
              failCount++;
              console.error(`Failed to create button ${buttonNum}`);
            }
          } catch (err) {
            failCount++;
            console.error(`Error creating button ${buttonNum}:`, err);
          }
        }
        
        hideLoading();
        createBtn.disabled = false;
        createBtn.textContent = 'Create Button Entry';
        
        if (failCount === 0) {
          showMsg(`✓ Successfully created all ${successCount} buttons!`, 'success');
        } else {
          showMsg(`Created ${successCount} buttons, ${failCount} failed`, 'error');
        }
        
        clearForm();
        loadItems();
        
      } catch (err) {
        hideLoading();
        createBtn.disabled = false;
        createBtn.textContent = 'Create Button Entry';
        showMsg('Batch create error: ' + err.message, 'error');
      }
    }

    function clearForm() {
      ['title', 'content', 'material', 'size', 'diameter', 'color', 'holes', 'style', 'nbsCode', 'division', 'section', 'sectionName', 'age', 'backType', 'pictorialSubject', 'pattern', 'usageType', 'buttonCondition', 'manufacturer', 'notes'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('imageFiles').value = '';
      document.getElementById('imagePreview').innerHTML = '';
      document.getElementById('analyzingMsg').classList.add('hidden');
      document.getElementById('createBtn').textContent = 'Create Button Entry';
      uploadedImages = [];
      buttonsData = [];
    }

    async function loadItems() {
      try {
        const res = await fetch(API_URL + '/api/v1/items', {
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        
        if (res.ok) {
          const itemsHTML = data.data.map(item => {
            let imagesHTML = '';
            if (item.images && item.images.length > 0) {
              imagesHTML = '<div class="item-images">' + 
                item.images.map(img => `<img src="${API_URL}${img.url}" alt="${item.title}" onclick="window.open(this.src)">`).join('') +
                '</div>';
            }
            
            let detailsHTML = '<div class="button-details">';
            if (item.material) detailsHTML += '<div><strong>Material:</strong> ' + item.material + '</div>';
            if (item.color) detailsHTML += '<div><strong>Color:</strong> ' + item.color + '</div>';
            if (item.size) detailsHTML += '<div><strong>Size:</strong> ' + item.size + '</div>';
            if (item.diameter) detailsHTML += '<div><strong>Diameter:</strong> ' + item.diameter + '</div>';
            if (item.holes != null) detailsHTML += '<div><strong>Holes:</strong> ' + item.holes + '</div>';
            if (item.style) detailsHTML += '<div><strong>Style:</strong> ' + item.style + '</div>';
            if (item.nbsCode) detailsHTML += '<div><strong>NBS:</strong> ' + item.nbsCode + '</div>';
            if (item.buttonCondition) detailsHTML += '<div><strong>Condition:</strong> ' + item.buttonCondition + '</div>';
            if (item.manufacturer) detailsHTML += '<div><strong>Mfg:</strong> ' + item.manufacturer + '</div>';
            if (item.notes) detailsHTML += '<div><strong>Notes:</strong> ' + item.notes + '</div>';
            detailsHTML += '</div>';
            
            return `
              <div class="item-card">
                ${imagesHTML}
                <h3>${item.title}</h3>
                <p>${item.content || ''}</p>
                ${detailsHTML}
                <button class="delete-btn" onclick="deleteItem(${item.id})" style="margin-top: 10px;">Delete</button>
              </div>
            `;
          }).join('');
          
          document.getElementById('itemsSection').innerHTML = itemsHTML || '<p>No buttons yet. Add one!</p>';
        }
      } catch (err) {
        showMsg('Failed to load items: ' + err.message, 'error');
      }
    }

    async function deleteItem(id) {
      if (!confirm('Delete this button entry?')) return;
      
      showLoading('Deleting...');
      try {
        const res = await fetch(API_URL + '/api/v1/items/' + id, {
          method: 'DELETE',
          headers: { 'Authorization': 'Bearer ' + token }
        });
        
        hideLoading();
        if (res.ok) {
          showMsg('✓ Button deleted', 'success');
          loadItems();
        } else {
          showMsg('Failed to delete', 'error');
        }
      } catch (err) {
        hideLoading();
        showMsg('Network error: ' + err.message, 'error');
      }
    }

    function showMsg(msg, type) {
      const el = document.getElementById('message');
      el.textContent = msg;
      el.className = type;
      const timeout = type === 'error' ? 10000 : 5000; // Errors stay 10s, success 5s
      setTimeout(function() { el.textContent = ''; el.className = ''; }, timeout);
    }
  
