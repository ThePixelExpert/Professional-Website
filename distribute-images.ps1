# Edwards Engineering - Docker Image Distribution Script (PowerShell)
# This script builds Docker images on the master node and distributes them to all worker nodes

param(
    [string]$MasterNode = "192.168.0.40",
    [string[]]$WorkerNodes = @("192.168.0.41", "192.168.0.42", "192.168.0.43"),
    [string]$SshUser = "pi",
    [string]$SshPass = $env:SSH_PASSWORD ?? "change_me",
    [string]$ProjectDir = "~/Professional-website"
)

function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function SSH-Execute {
    param([string]$Node, [string]$Command)
    Write-ColorText "Executing on ${Node}: ${Command}" "Yellow"
    
    # Use plink (PuTTY) or ssh if available
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        echo y | plink -ssh -l $SshUser -pw $SshPass $Node $Command
    } else {
        # Fallback to ssh (requires key-based auth or manual password entry)
        ssh "${SshUser}@${Node}" $Command
    }
}

Write-ColorText "=== Edwards Engineering Docker Image Distribution ===" "Green"

Write-ColorText "Step 1: Building Docker images on master node..." "Green"
SSH-Execute $MasterNode "cd $ProjectDir && docker build -t edwards-engineering-frontend:latest -f Dockerfile.frontend ."
SSH-Execute $MasterNode "cd $ProjectDir && docker build -t edwards-engineering-backend:latest -f Dockerfile.backend ."

Write-ColorText "Step 2: Saving Docker images to tar files..." "Green"
SSH-Execute $MasterNode "cd $ProjectDir && docker save edwards-engineering-frontend:latest -o frontend-image.tar"
SSH-Execute $MasterNode "cd $ProjectDir && docker save edwards-engineering-backend:latest -o backend-image.tar"

Write-ColorText "Step 3: Distributing images to worker nodes..." "Green"
foreach ($node in $WorkerNodes) {
    Write-ColorText "Processing node: $node" "Yellow"
    
    # Copy tar files to worker node
    SSH-Execute $MasterNode "scp -o StrictHostKeyChecking=no ${ProjectDir}/frontend-image.tar ${SshUser}@${node}:~/"
    SSH-Execute $MasterNode "scp -o StrictHostKeyChecking=no ${ProjectDir}/backend-image.tar ${SshUser}@${node}:~/"
    
    # Load images on worker node
    SSH-Execute $node "docker load -i ~/frontend-image.tar"
    SSH-Execute $node "docker load -i ~/backend-image.tar"
    
    # Clean up tar files
    SSH-Execute $node "rm -f ~/frontend-image.tar ~/backend-image.tar"
    
    Write-ColorText "✓ Images distributed to $node" "Green"
}

Write-ColorText "Step 4: Cleaning up tar files on master..." "Green"
SSH-Execute $MasterNode "cd $ProjectDir && rm -f frontend-image.tar backend-image.tar"

Write-ColorText "Step 5: Verifying images on all nodes..." "Green"
Write-ColorText "Master node images:" "Yellow"
SSH-Execute $MasterNode "docker images | grep edwards-engineering"

foreach ($node in $WorkerNodes) {
    Write-ColorText "Node $node images:" "Yellow"
    SSH-Execute $node "docker images | grep edwards-engineering"
}

Write-ColorText "=== Image distribution complete! ===" "Green"
Write-ColorText "Next steps:" "Yellow"
Write-ColorText "1. Delete failing pods: sudo k3s kubectl delete pods -l app=frontend --field-selector=status.phase=Failed"
Write-ColorText "2. Delete failing pods: sudo k3s kubectl delete pods -l app=backend --field-selector=status.phase=Failed"
Write-ColorText "3. Apply updated deployments: sudo k3s kubectl apply -f k8s/"
Write-ColorText "4. Monitor pod distribution: sudo k3s kubectl get pods -o wide -w"