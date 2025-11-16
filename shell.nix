{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Docker and Docker Buildx
    docker
    docker-buildx
    
    # Ansible for deployment automation
    ansible
    
    # Utilities needed by build-and-deploy.sh
    openssh        # SSH client for scp/ssh commands
    curl           # For registry API calls
    jq             # JSON parsing for cleanup
    coreutils      # Basic utilities (date, etc.)
    bash           # Shell
    
    # Optional but useful
    git
  ];

  shellHook = ''
    echo "Professional Website Development Environment"
    echo "============================================="
    echo ""
    echo "Available tools:"
    echo "  - docker & docker buildx"
    echo "  - ansible"
    echo "  - ssh/scp"
    echo "  - curl, jq"
    echo ""
    echo "To run your build and deploy script:"
    echo "  cd scripts && ./build-and-deploy.sh"
    echo ""
    
    # Ensure docker buildx is available
    if command -v docker &> /dev/null; then
      export DOCKER_BUILDKIT=1
    fi
  '';
}
