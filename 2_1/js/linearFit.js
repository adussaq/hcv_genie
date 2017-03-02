/*global LINEARFIT*/
var LINEARFIT = (function () {
    'use strict';

    //Expects a numberical matrix for X and a vector for y in that order.

    var power_set, matrix_invert, matrix_transpose, matrix_mult, matrix_check, main, recurse;
    matrix_invert = function (M) {
        //Took from: http://blog.acipo.com/matrix-inversion-in-javascript/
        // I use Guassian Elimination to calculate the inverse:
        // (1) 'augment' the matrix (left) by the identity (on the right)
        // (2) Turn the matrix on the left into the identity by elemetry row ops
        // (3) The matrix on the right is the inverse (was the identity matrix)
        // There are 3 elemtary row ops: (I combine b and c in my code)
        // (a) Swap 2 rows
        // (b) Multiply a row by a scalar
        // (c) Add 2 rows

        var i = 0, ii = 0, j = 0, dim = M.length, e = 0, I = [],
                C = [];

        //if the matrix isn't square: exit (error)
        if (M.length !== M[0].length) {
            return null;
        }

        //create the identity matrix (I), and a copy (C) of the original
        for (i = 0; i < dim; i += 1) {
            // Create the row
            I[I.length] = [];
            C[C.length] = [];
            for (j = 0; j < dim; j += 1) {

                //if we're on the diagonal, put a 1 (for identity)
                if (i === j) {
                    I[i][j] = 1;
                } else {
                    I[i][j] = 0;
                }
                // Also, make the copy of the original
                C[i][j] = M[i][j];
            }
        }

        // Perform elementary row operations
        for (i = 0; i < dim; i += 1) {
            // get the element e on the diagonal
            e = C[i][i];

            // if we have a 0 on the diagonal (we'll need to swap with a lower row)
            if (e === 0) {
                //look through every row below the i'th row
                for (ii = i + 1; ii < dim; ii += 1) {
                    //if the ii'th row has a non-0 in the i'th col
                    if (C[ii][i] !== 0) {
                        //it would make the diagonal have a non-0 so swap it
                        for (j = 0; j < dim; j += 1) {
                            e = C[i][j];       //temp store i'th row
                            C[i][j] = C[ii][j];//replace i'th row by ii'th
                            C[ii][j] = e;      //repace ii'th by temp
                            e = I[i][j];       //temp store i'th row
                            I[i][j] = I[ii][j];//replace i'th row by ii'th
                            I[ii][j] = e;      //repace ii'th by temp
                        }
                        //don't bother checking other rows since we've swapped
                        break;
                    }
                }
                //get the new diagonal
                e = C[i][i];
                //if it's still 0, not invertable (error)
                if (e === 0) {
                    return null;
                }
            }

            // Scale this row down by e (so we have a 1 on the diagonal)
            for (j = 0; j < dim; j += 1) {
                C[i][j] = C[i][j] / e; //apply to original matrix
                I[i][j] = I[i][j] / e; //apply to identity
            }

            // Subtract this row (scaled appropriately for each row) from ALL of
            // the other rows so that there will be 0's in this column in the
            // rows above and below this one
            for (ii = 0; ii < dim; ii += 1) {
                // Only apply to other rows (we want a 1 on the diagonal)
                if (ii === i) {
                    continue;
                }

                // We want to change this element to 0
                e = C[ii][i];

                // Subtract (the row above(or below) scaled by e) from (the
                // current row) but start at the i'th column and assume all the
                // stuff left of diagonal is 0 (which it should be if we made this
                // algorithm correctly)
                for (j = 0; j < dim; j += 1) {
                    C[ii][j] -= e * C[i][j]; //apply to original matrix
                    I[ii][j] -= e * I[i][j]; //apply to identity
                }
            }
        }

        //we've done all operations, C should be the identity
        //matrix I should be the inverse:
        return I;
    };

    matrix_transpose = function (M) {
        return M[0].map(function (col, i) {
            return M.map(function (row) {
                return row[i];
            });
        });
    };

    matrix_check = function (X) {
        //check for identity matrix (or at elast close)
        var i, j, ret = true, one = 1, zero = 0;
        for (i = 0; i < X.length; i += 1) {
            //check diagonal
            if (X[i][i].toFixed(5) !== one.toFixed(5)) {
                ret = false;
                break;
            }

            //And check non diagonals
            for (j = 0; j < X.length; j += 1) {
                if (i !== j) {
                    if (Math.abs(X[i][j]).toFixed(5) !== zero.toFixed(5)) {
                        ret = false;
                        break;
                    }
                }
            }
        }
        return ret;
    };

    matrix_mult = function (m1, m2) {
        var result = [], i, j, k, sum;
        for (i = 0; i < m1.length; i += 1) {
            result[i] = [];
            for (j = 0; j < m2[0].length; j += 1) {
                sum = 0;
                for (k = 0; k < m1[0].length; k += 1) {
                    sum += m1[i][k] * m2[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    };

    power_set = function (list) {
    //http://codereview.stackexchange.com/questions/7001/generating-all-combinations-of-an-array
        var set = [], listSize = list.length,
                combinationsCount = (1 << listSize), combination, i, j, check;

        for (i = 1; i < combinationsCount; i += 1) {
            combination = [];
            for (j = 0; j < listSize; j += 1) {
                check = i & (1 << j);
                if (check) {
                    combination.push(list[j]);
                }
            }
            set.push(combination);
        }
        return set.sort(function (a, b) {
            return b.length - a.length;
        });
    };

    recurse = function (X, y) {
        var i, j, k, newX, list = [], currentLen, sol, max, ans = [], last;

        for (i = 0; i < X[0].length - 1; i += 1) {
            list.push(i);
        }
        list = power_set(list);
        list.shift(); //gets rid of set of all.

        currentLen = list[0].length;
        console.log(list);
        for (i = 0; i < list.length; i += 1) {
            currentLen = list[i].length;
            // if (currentLen === list[i].length) {
                newX = [];
                for (j = 0; j < X.length; j += 1) {
                    newX[j] = [];
                    for (k = 0; k < currentLen; k += 1) {
                        newX[j].push(X[j][list[i][k]]);
                    }
                }
                sol = main(newX, y, false);
                if (sol) {
                    last = -1;
                    //Add in 0's
                    for (k = 0; k < currentLen; k += 1) {
                        while (list[i][k] !== last + 1) {
                            console.log('weird...', list[i][k], last, list[i]);
                            sol.params.splice(last + 1, 0, 0);
                            last += 1;
                        }
                        last += 1;
                    }
                    for (k = last + 1; k < X[0].length - 1; k += 1) {
                        sol.params.splice(k, 0, 0);
                    }
                }
                ans.push(sol);
            // }
        }

        console.log(ans);
        max = {ret: false, val: 0};
        for (i = 0; i < ans.length; i += 1) {
            if (ans[i] && ans[i].R2 > max.val) {
                max.val = ans[i].R2;
                max.ret = ans[i];
            }
        }
        return max.ret;
    };

    main = function (X, y_orgin, tryAll) {
        var R2, sol, a, ainv, b, parameters, mean_y = 0, std_y = 0, error, solution, y;
        if (tryAll === undefined) {
            tryAll = true;
        }
        X = X.map(function (x) {
            return x.concat(1); //adds in the constant
        });
        y = y_orgin.map(function (x) {
            mean_y += x;
            return [x];
        });
        mean_y /= y.length;
        // console.log(X,y)
        a = matrix_mult(matrix_transpose(X), X);
        ainv = matrix_invert(a);

        //check to make sure inversion worked
        if (!matrix_check(matrix_mult(ainv, a)) || !matrix_check(matrix_mult(a, ainv))) {
            if (tryAll) {
                solution = recurse(X, y_orgin);
            } else {
                solution = false;
            }
        } else {
            b = matrix_mult(ainv, matrix_transpose(X));
            sol = matrix_mult(b, y);
            parameters = sol.map(function (x) {
                return x[0];
            });

            error = X.map(function (x, ind) {
                var ii, sum = 0;
                for (ii = 0; ii < x.length; ii += 1) {
                    sum += x[ii] * parameters[ii];
                }
                std_y += Math.pow(y[ind][0] - mean_y, 2);
                return Math.pow(y[ind][0] - sum, 2);
            }).reduce(function (a, b) {
                return a + b;
            });
            R2 = 1 - error / std_y;
            solution = {params: parameters, R2: R2, adj_R2: 1 - ((1 - R2) * (X.length - 1) / (X.length - X[0].length - 2))};
        }
        console.log(solution, X.length, X[0].length);
        return solution;
    };

    return main;
}());