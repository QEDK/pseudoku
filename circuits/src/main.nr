fn main(solution: (Field, [[u8; 9]; 9]), challenge: pub (Field, [[u8; 9]; 9])) {
    assert(solution.0 == challenge.0, "Invalid commitment");
    for i in 0..9 {
        for j in 0..9 {
            let filled_cell = solution.1[i][j];
            assert(filled_cell >= 1 & filled_cell <= 9, "Invalid cell value");
            if challenge.1[i][j] != 0 {
                assert(filled_cell == challenge.1[i][j], "Solution does not match challenge");
            }
        }
    }
    
    // Check rows
    for i in 0..9 {
        assert(has_all_digits(get_row(solution.1, i)), "Row solution is incorrect");
    }
    
    // Check columns
    for j in 0..9 {
        assert(has_all_digits(get_column(solution.1, j)), "Column solution is incorrect");
    }
    
    // Check 3x3 boxes
    for box_idx in 0..9 {
        assert(has_all_digits(get_box(solution.1, box_idx)), "Box solution is incorrect");
    }
}

// Helper functions
fn get_row(grid: [[u8; 9]; 9], row: u8) -> [u8; 9] {
    grid[row as u32]
}

fn get_column(grid: [[u8; 9]; 9], col: u8) -> [u8; 9] {
    let mut column = [0; 9];
    for i in 0..9 {
        column[i] = grid[i][col as u32];
    }
    column
}

fn get_box(grid: [[u8; 9]; 9], box_idx: u8) -> [u8; 9] {
    let mut box_values = [0; 9];
    let box_row = box_idx / 3;
    let box_col = box_idx % 3;
    let mut idx = 0;
    
    for i in 0..3 {
        for j in 0..3 {
            box_values[idx] = grid[(box_row * 3) as u32 + i][(box_col * 3) as u32 + j];
            idx += 1;
        }
    }
    box_values
}

fn has_all_digits(values: [u8; 9]) -> bool {
    let mut seen = [false; 9];
    let mut flag = true;
    for val in values {
        if val < 1 | val > 9 | seen[val as u32 - 1] {
            flag = false; // ideally should be a Brillig function... but alas
        }
        seen[val as u32 - 1] = true;
    }
    flag
}

#[test]
fn test_valid_sudoku() {
    let solution = (0, [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9],
    ]);

    let challenge = (0, [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ]);
    
    main(solution, challenge);
}
