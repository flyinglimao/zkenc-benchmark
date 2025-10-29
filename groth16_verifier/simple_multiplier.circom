pragma circom 2.0.0;

// Simple multiplier circuit for testing Groth16 verifier
// This circuit proves knowledge of two private numbers (a, b)
// that multiply to equal a public product (c)
template Multiplier() {
    signal input a;  // private
    signal input b;  // private
    signal input c;  // public - the expected product

    // Constraint: a * b must equal c
    a * b === c;
}

component main {public [c]} = Multiplier();
