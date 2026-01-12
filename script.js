
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const fileCount = document.getElementById('fileCount');
const emptyState = document.getElementById('emptyState');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const buttonGroup = document.getElementById('buttonGroup');
const loadingContainer = document.getElementById('loadingContainer');
const errorAlert = document.querySelector('.error-alert');
const successAlert = document.querySelector('.success-alert');
const errorMessage = document.getElementById('error-message');
const successMessage = document.getElementById('success-message');

let selectedFiles = [];
let selectedModel = null;
const modelModal = new bootstrap.Modal(document.getElementById('modelModal'), {
    backdrop: 'static',
    keyboard: false
});

const tesseractModal = new bootstrap.Modal(document.getElementById('tesseractModal'), {
    backdrop: 'static',
    keyboard: false
});

// Drag and Drop
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['txt', 'pdf', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'bmp'].includes(ext);
    });

    if (selectedFiles.length === 0) {
        showError('Nenhum arquivo válido selecionado. Use apenas TXT, PDF, Excel ou Imagens.');
        return;
    }

    selectedModel = null;
    modelModal.show();
    updateFileList();
    hideError();
}

function updateFileList() {
    fileCount.textContent = selectedFiles.length;
    fileList.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const size = formatFileSize(file.size);
        const ext = file.name.split('.').pop().toUpperCase();
        let icon = 'bi-file-text';
        if (ext === 'PDF') icon = 'bi-file-pdf';
        else if (['XLSX', 'XLS'].includes(ext)) icon = 'bi-file-earmark-excel';
        else if (['JPG', 'JPEG', 'PNG', 'BMP'].includes(ext)) icon = 'bi-image';

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
                    <div class="file-item-info">
                        <i class="bi ${icon}"></i>
                        <div>
                            <div class="file-item-name">${file.name}</div>
                            <div class="file-item-size">${size}</div>
                        </div>
                    </div>
                    <button class="remove-file-btn" onclick="removeFile(${index})">
                        <i class="bi bi-x"></i>
                    </button>
                `;
        fileList.appendChild(fileItem);
    });

    if (selectedFiles.length > 0) {
        fileListContainer.style.display = 'block';
        emptyState.style.display = 'none';
        buttonGroup.style.display = 'flex';
    } else {
        fileListContainer.style.display = 'none';
        emptyState.style.display = 'block';
        buttonGroup.style.display = 'none';
    }
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updateFileList();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function showError(message) {
    errorMessage.textContent = message;
    errorAlert.style.display = 'block';
    setTimeout(() => {
        errorAlert.style.display = 'none';
    }, 5000);
}

function hideError() {
    errorAlert.style.display = 'none';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successAlert.style.display = 'block';
    setTimeout(() => {
        successAlert.style.display = 'none';
    }, 3000);
}

generateBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) {
        showError('Selecione pelo menos um arquivo!');
        return;
    }

    if (!selectedModel) {
        showError('Selecione um modelo de planilha!');
        return;
    }

    // Mostrar loading
    fileListContainer.style.display = 'none';
    buttonGroup.style.display = 'none';
    loadingContainer.style.display = 'block';
    generateBtn.disabled = true;

    try {
        const formData = new FormData();
        selectedFiles.forEach(file => {
            formData.append('files', file);
        });
        formData.append('model', selectedModel);

        console.log('Enviando requisição para http://localhost:5000/api/upload');
        console.log('Modelo:', selectedModel);
        console.log('Arquivos:', selectedFiles.map(f => f.name));

        const response = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            body: formData
        }).catch(error => {
            console.error('Erro de fetch:', error);
            throw new Error(`Falha ao conectar ao servidor (localhost:5000): ${error.message}`);
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorMsg = 'Erro ao processar arquivos';
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMsg = errorData.detail || errorMsg;
                } else {
                    errorMsg = await response.text();
                }
            } catch (e) {
                errorMsg = `Erro ${response.status}: ${response.statusText}`;
            }
            
            throw new Error(errorMsg);
        }

        // Obtém o nome do arquivo do header Content-Disposition
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'AgilizaConverter.xlsx';
        if (contentDisposition) {
            // Tenta extrair filename do header (com ou sem aspas)
            const filenameMatch = contentDisposition.match(/filename\*=(?:UTF-8'')?(.+?)(?:;|$)|filename="([^"]+)"|filename=([^;\s]+)/);
            if (filenameMatch) {
                filename = filenameMatch[1] || filenameMatch[2] || filenameMatch[3];
                // Decode se estiver URL encoded
                try {
                    filename = decodeURIComponent(filename);
                } catch (e) {
                    // Usar o filename como está se não conseguir decodificar
                }
            }
        }

        // Download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showSuccess(`${selectedFiles.length} arquivo(s) processado(s) com sucesso! Download iniciado.`);
        clearFiles();
    } catch (error) {
        const errorMsg = error.message;
        showError(`Erro: ${errorMsg}`);
        
        // Mostra alerta de Tesseract se o erro é relacionado a OCR
        if (errorMsg.includes('tesseract') || errorMsg.includes('OCR') || errorMsg.includes('Nenhum dado extraído')) {
            document.getElementById('tesseractAlert').style.display = 'block';
        }
        
        console.error('Erro:', error);
    } finally {
        loadingContainer.style.display = 'none';
        generateBtn.disabled = false;
        fileListContainer.style.display = 'block';
        buttonGroup.style.display = 'flex';
    }
});

clearBtn.addEventListener('click', () => {
    clearFiles();
});

// Event listeners para o modal de modelo
document.querySelectorAll('.model-card').forEach(card => {
    card.addEventListener('click', function() {
        // Remove seleção anterior
        document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
        
        // Adiciona seleção ao card clicado
        this.classList.add('selected');
        
        // Atualiza modelo selecionado
        selectedModel = this.dataset.model;
        
        // Fecha modal automaticamente após seleção
        modelModal.hide();
    });
});

function clearFiles() {
    selectedFiles = [];
    fileInput.value = '';
    selectedModel = null;
    updateFileList();
    hideError();
}

// Atualizar lista inicial
updateFileList();

// Função para mostrar instruções de Tesseract
function mostrarInstrucoesTesseract() {
    tesseractModal.show();
}