import numpy as np
from functools import reduce

def task_func(list_of_pairs):
    """ 
    Calculate the product of the second values in each tuple in a list of tuples and return the product as a single-element numeric array.
    
    Parameters:
    list_of_pairs (list): A list of tuples, where the first element is the category 
                          and the second element is the numeric value.
    
    Returns:
    numpy.ndarray: A 1D numpy array containing a single element that is the product of the second values in the list of tuples.
    
    Requirements:
    - numpy
    - functools.reduce
    
    Example:
    >>> list_of_pairs = [('Fruits', 5), ('Vegetables', 9), ('Dairy', -1), ('Bakery', -2), ('Meat', 4)]
    >>> product_array = task_func(list_of_pairs)
    >>> print(product_array)
    [360]
    """
